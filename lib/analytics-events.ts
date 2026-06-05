// lib/analytics-events.ts
/**
 * واجهة موحّدة لإرسال أحداث تحليلية في ORCA CRM.
 * في الإنتاج: أبدل console.log بـ fetch('/api/v1/dashboard/telemetry', ...).
 */

export type AnalyticsPayload =
  | {
      event: 'ui.sidebar.rename';
      oldName: string;
      newName: string;
      actorId: string;
      timestamp: string;
    }
  | {
      event: 'ui.sidebar.reorg';
      movedItems: Array<{ label: string; oldPath: string; newPath: string }>;
      actorId: string;
      timestamp: string;
    };

export function trackEvent(payload: AnalyticsPayload): void {
  // Development: log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ORCA Analytics]', payload);
    return;
  }

  // Production: fire-and-forget to telemetry endpoint
  try {
    fetch('/api/v1/dashboard/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // silent — telemetry must never break UI
    });
  } catch {
    // silent
  }
}

/**
 * يُستدعى مرة واحدة عند أول تحميل للسيدبار بعد تفعيل feature flag.
 * يُرسل حدثَي rename و reorg.
 */
export function emitSidebarReorgEvents(actorId = 'system'): void {
  const ts = new Date().toISOString();

  trackEvent({
    event: 'ui.sidebar.rename',
    oldName: 'النمو والتسويق',
    newName: 'التسويق والإعلان',
    actorId,
    timestamp: ts,
  });

  trackEvent({
    event: 'ui.sidebar.reorg',
    movedItems: [
      {
        label: 'الحملات التسويقية',
        oldPath: '/operations/growth',
        newPath: '/operations/marketing',
      },
      {
        label: 'النمو',
        oldPath: '/operations/growth',
        newPath: '/operations/marketing?tab=growth',
      },
      {
        label: 'التسوق',
        oldPath: '/operations/shopping',
        newPath: '/operations/marketing?tab=shopping',
      },
    ],
    actorId,
    timestamp: ts,
  });
}
