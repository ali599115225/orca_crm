"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  filterEventsAfter,
  maxCursor,
  parseClientSyncPage,
  REALTIME_SYNC_CHANNEL,
  REALTIME_SYNC_EVENT,
  retryDelayMs,
  selectRealtimeLeader,
  type ClientSyncPage,
  type RealtimePeer,
} from "@/lib/realtime/client-runtime";

const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 1_000;
const PEER_TTL_MS = 3_500;
const DISCOVERY_DELAY_MS = 350;

type ChannelMessage =
  | {
      type: "peer";
      senderId: string;
      visible: boolean;
      sentAt: number;
    }
  | {
      type: "leave";
      senderId: string;
    }
  | {
      type: "page";
      senderId: string;
      page: ClientSyncPage;
    };

export interface RealtimeSyncState {
  isLeader: boolean;
  online: boolean;
  cursor: string;
  lastEventAt: string | null;
  error: string | null;
}

const RealtimeSyncContext = createContext<RealtimeSyncState | null>(null);

function createTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const tabIdRef = useRef("");
  const cursorRef = useRef("0");
  const leaderRef = useRef(false);
  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const failureCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const peersRef = useRef<Map<string, RealtimePeer>>(new Map());
  const pollRef = useRef<() => Promise<void>>(async () => undefined);

  const [state, setState] = useState<RealtimeSyncState>({
    isLeader: false,
    online: true,
    cursor: "0",
    lastEventAt: null,
    error: null,
  });

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback(
    (delayMs: number) => {
      clearPollTimer();
      if (!mountedRef.current || !leaderRef.current) return;

      pollTimerRef.current = setTimeout(() => {
        void pollRef.current();
      }, delayMs);
    },
    [clearPollTimer],
  );

  const dispatchPage = useCallback((page: ClientSyncPage) => {
    if (page.resetRequired) {
      cursorRef.current = page.nextCursor;
      setState((current) => ({
        ...current,
        cursor: page.nextCursor,
        lastEventAt: new Date().toISOString(),
        error: null,
      }));

      window.dispatchEvent(
        new CustomEvent(REALTIME_SYNC_EVENT, {
          detail: {
            events: [],
            nextCursor: page.nextCursor,
            resetRequired: true,
          },
        }),
      );
      return;
    }

    const events = filterEventsAfter(page.events, cursorRef.current);
    cursorRef.current = maxCursor(cursorRef.current, page.nextCursor);

    setState((current) => ({
      ...current,
      cursor: cursorRef.current,
      lastEventAt:
        events.length > 0 ? new Date().toISOString() : current.lastEventAt,
      error: null,
    }));

    if (events.length > 0) {
      window.dispatchEvent(
        new CustomEvent(REALTIME_SYNC_EVENT, {
          detail: {
            events,
            nextCursor: cursorRef.current,
            resetRequired: false,
          },
        }),
      );
    }
  }, []);

  const broadcastPeer = useCallback(() => {
    const senderId = tabIdRef.current;
    if (!senderId) return;

    const visible = document.visibilityState === "visible";
    const sentAt = Date.now();

    peersRef.current.set(senderId, {
      id: senderId,
      visible,
      lastSeenAt: sentAt,
    });

    channelRef.current?.postMessage({
      type: "peer",
      senderId,
      visible,
      sentAt,
    } satisfies ChannelMessage);
  }, []);

  const electLeader = useCallback(() => {
    const leaderId = selectRealtimeLeader(
      peersRef.current.values(),
      Date.now(),
      PEER_TTL_MS,
    );
    const nextLeader = leaderId === tabIdRef.current;

    if (leaderRef.current === nextLeader) return;

    leaderRef.current = nextLeader;
    setState((current) => ({ ...current, isLeader: nextLeader }));

    if (nextLeader) {
      schedulePoll(0);
    } else {
      clearPollTimer();
    }
  }, [clearPollTimer, schedulePoll]);

  const performPoll = useCallback(async () => {
    if (
      !mountedRef.current ||
      !leaderRef.current ||
      inFlightRef.current ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    ) {
      schedulePoll(POLL_INTERVAL_MS);
      return;
    }

    inFlightRef.current = true;
    let nextDelay = POLL_INTERVAL_MS;

    try {
      const response = await fetch(
        `/api/v1/sync/events?after=${encodeURIComponent(
          cursorRef.current,
        )}&limit=100`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      if (response.status === 401) {
        cursorRef.current = "0";
        failureCountRef.current = 0;
        setState((current) => ({
          ...current,
          cursor: "0",
          error: null,
        }));
        nextDelay = 15_000;
        return;
      }

      if (!response.ok) {
        throw new Error(`Sync request failed with ${response.status}`);
      }

      const page = parseClientSyncPage(await response.json());
      failureCountRef.current = 0;
      dispatchPage(page);

      channelRef.current?.postMessage({
        type: "page",
        senderId: tabIdRef.current,
        page,
      } satisfies ChannelMessage);

      nextDelay = page.hasMore ? 0 : POLL_INTERVAL_MS;
    } catch (error) {
      failureCountRef.current += 1;
      nextDelay = retryDelayMs(failureCountRef.current);
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Sync unavailable",
      }));
    } finally {
      inFlightRef.current = false;
      schedulePoll(nextDelay);
    }
  }, [dispatchPage, schedulePoll]);

  pollRef.current = performPoll;

  useEffect(() => {
    mountedRef.current = true;
    tabIdRef.current = createTabId();
    setState((current) => ({ ...current, online: navigator.onLine }));

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(REALTIME_SYNC_CHANNEL);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        const message = event.data;
        if (!message || message.senderId === tabIdRef.current) return;

        if (message.type === "peer") {
          peersRef.current.set(message.senderId, {
            id: message.senderId,
            visible: message.visible,
            lastSeenAt: message.sentAt,
          });
          electLeader();
          return;
        }

        if (message.type === "leave") {
          peersRef.current.delete(message.senderId);
          electLeader();
          return;
        }

        if (message.type === "page") {
          dispatchPage(message.page);
        }
      };
    }

    const onVisibilityChange = () => {
      broadcastPeer();
      electLeader();
      if (
        document.visibilityState === "visible" &&
        leaderRef.current &&
        navigator.onLine
      ) {
        schedulePoll(0);
      }
    };

    const onFocus = () => {
      broadcastPeer();
      electLeader();
      if (leaderRef.current && navigator.onLine) {
        schedulePoll(0);
      }
    };

    const onOnline = () => {
      setState((current) => ({ ...current, online: true }));
      broadcastPeer();
      electLeader();
      if (leaderRef.current) schedulePoll(0);
    };

    const onOffline = () => {
      setState((current) => ({ ...current, online: false }));
      clearPollTimer();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    broadcastPeer();

    const discoveryTimer = setTimeout(() => {
      electLeader();
    }, DISCOVERY_DELAY_MS);

    const heartbeatTimer = setInterval(() => {
      broadcastPeer();
      electLeader();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearPollTimer();
      clearTimeout(discoveryTimer);
      clearInterval(heartbeatTimer);

      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);

      channelRef.current?.postMessage({
        type: "leave",
        senderId: tabIdRef.current,
      } satisfies ChannelMessage);
      channelRef.current?.close();
      channelRef.current = null;
      peersRef.current.clear();
    };
  }, [
    broadcastPeer,
    clearPollTimer,
    dispatchPage,
    electLeader,
    schedulePoll,
  ]);

  const contextValue = useMemo(() => state, [state]);

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSync(): RealtimeSyncState {
  const context = useContext(RealtimeSyncContext);
  if (!context) {
    throw new Error(
      "useRealtimeSync must be used inside RealtimeSyncProvider",
    );
  }
  return context;
}