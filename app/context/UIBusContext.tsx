// app/context/UIBusContext.tsx
// 🚌 UI Bus المركزي - نظام نشر/اشتراك موحد للإشعارات والأحداث
// يحل محل الاستدعاءات المبعثرة ويوحد تدفق البيانات في الواجهة

"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from "react";

// ─── أنواع البيانات ──────────────────────────────────────────────────────────

export type NotificationType = "success" | "error" | "warning" | "info";
export type BusEventType =
  | "NOTIFICATION"
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "LEAD_DELETED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "AGENT_STATUS_CHANGE"
  | "TENANT_UPDATE"
  | "SESSION_EXPIRED"
  | "SYSTEM_ALERT"
  | "MODAL_OPEN"
  | "MODAL_CLOSE"
  | "REFRESH_DATA";

export interface BusEvent<T = any> {
  type: BusEventType;
  payload?: T;
  timestamp: number;
  id: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms - 0 = لا يُغلق تلقائياً
  action?: { label: string; onClick: () => void };
}

type EventHandler<T = any> = (event: BusEvent<T>) => void;

interface UIBusContextType {
  // نشر الأحداث
  publish: <T = any>(type: BusEventType, payload?: T) => void;
  // الاشتراك في الأحداث
  subscribe: <T = any>(type: BusEventType | "*", handler: EventHandler<T>) => () => void;
  // الإشعارات
  notify: (notification: Omit<Notification, "id">) => string;
  dismissNotification: (id: string) => void;
  notifications: Notification[];
  // حالة عالمية مشتركة
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

// ─── الـ Context ─────────────────────────────────────────────────────────────

const UIBusContext = createContext<UIBusContextType | undefined>(undefined);

// ─── مكوّن الإشعار الفردي ───────────────────────────────────────────────────

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  success: "border-emerald-500/50 bg-emerald-950/80",
  error: "border-red-500/50 bg-red-950/80",
  warning: "border-amber-500/50 bg-amber-950/80",
  info: "border-indigo-500/50 bg-indigo-950/80",
};

const NOTIFICATION_ICON_COLORS: Record<NotificationType, string> = {
  success: "text-emerald-400",
  error: "text-[#A7C7E7]",
  warning: "text-amber-400",
  info: "text-indigo-400",
};

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // مؤثر الدخول
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!notification.duration || notification.duration === 0) return;
    const t = setTimeout(() => handleDismiss(), notification.duration);
    return () => clearTimeout(t);
  }, [notification.duration]);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl max-w-sm w-full
        transition-all duration-300 ease-out
        ${NOTIFICATION_COLORS[notification.type]}
        ${visible && !leaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"}
      `}
    >
      <span className={`text-lg font-bold mt-0.5 ${NOTIFICATION_ICON_COLORS[notification.type]}`}>
        {NOTIFICATION_ICONS[notification.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{notification.title}</p>
        {notification.message && (
          <p className="text-[#C4D8E5] font-medium text-xs mt-0.5 leading-relaxed">{notification.message}</p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors"
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="text-[#C4D8E5] font-medium hover:text-white text-lg leading-none transition-colors flex-shrink-0"
        aria-label="إغلاق الإشعار"
      >
        ×
      </button>
    </div>
  );
}

// ─── مكوّن حاوي الإشعارات ───────────────────────────────────────────────────

function NotificationCenter({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3"
      style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}
    >
      {notifications.slice(0, 5).map((n) => (
        <NotificationItem key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── مزود الـ UI Bus ─────────────────────────────────────────────────────────

export function UIBusProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoadingState] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // قاموس المشتركين
  const subscribers = useRef<Map<string, Set<EventHandler>>>(new Map());

  // ─── نشر الأحداث ──────────────────────────────────────────────────────────
  const publish = useCallback(<T = any>(type: BusEventType, payload?: T) => {
    const event: BusEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };

    // إشعار المشتركين الخاصين بهذا النوع
    const typeHandlers = subscribers.current.get(type);
    typeHandlers?.forEach((h) => h(event));

    // إشعار المشتركين العموميين (*)
    const globalHandlers = subscribers.current.get("*");
    globalHandlers?.forEach((h) => h(event));
  }, []);

  // ─── الاشتراك في الأحداث ──────────────────────────────────────────────────
  const subscribe = useCallback(
    <T = any>(type: BusEventType | "*", handler: EventHandler<T>) => {
      if (!subscribers.current.has(type)) {
        subscribers.current.set(type, new Set());
      }
      subscribers.current.get(type)!.add(handler as EventHandler);

      // إرجاع دالة إلغاء الاشتراك
      return () => {
        subscribers.current.get(type)?.delete(handler as EventHandler);
      };
    },
    []
  );

  // ─── الإشعارات ────────────────────────────────────────────────────────────
  const notify = useCallback((notification: Omit<Notification, "id">): string => {
    const id = crypto.randomUUID();
    const full: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };
    setNotifications((prev) => [...prev, full]);
    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ─── التحميل والمودال ─────────────────────────────────────────────────────
  const setLoading = useCallback((loading: boolean) => {
    setIsLoadingState(loading);
  }, []);

  const openModal = useCallback((modalId: string) => {
    setActiveModal(modalId);
    publish("MODAL_OPEN", { modalId });
  }, [publish]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    publish("MODAL_CLOSE", {});
  }, [publish]);

  // الاستماع لأحداث SESSION_EXPIRED والتعامل معها تلقائياً
  useEffect(() => {
    const unsubscribe = subscribe("SESSION_EXPIRED", () => {
      notify({
        type: "warning",
        title: "انتهت جلستك",
        message: "سيتم تحويلك لصفحة تسجيل الدخول...",
        duration: 3000,
      });
      setTimeout(() => {
        window.location.href = "/login?expired=1";
      }, 3000);
    });
    return unsubscribe;
  }, [subscribe, notify]);

  const value: UIBusContextType = {
    publish,
    subscribe,
    notify,
    dismissNotification,
    notifications,
    isLoading,
    setLoading,
    activeModal,
    openModal,
    closeModal,
  };

  return (
    <UIBusContext.Provider value={value}>
      {children}
      <NotificationCenter
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </UIBusContext.Provider>
  );
}

// ─── Hooks للاستخدام ─────────────────────────────────────────────────────────

export function useUIBus() {
  const ctx = useContext(UIBusContext);
  if (!ctx) {
    throw new Error("useUIBus must be used within UIBusProvider");
  }
  return ctx;
}

/** Hook مختصر للإشعارات فقط */
export function useNotify() {
  const { notify, dismissNotification, notifications } = useUIBus();
  return { notify, dismissNotification, notifications };
}

/** Hook مختصر للنشر والاشتراك */
export function useBusEvent(
  type: BusEventType | "*",
  handler: EventHandler,
  deps: React.DependencyList = []
) {
  const { subscribe } = useUIBus();
  useEffect(() => {
    const unsubscribe = subscribe(type, handler);
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
