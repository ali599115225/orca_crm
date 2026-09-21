// lib/saher/replayEngine.ts
// 🔄 محرك المزامنة الارتدادية (Replay Strategy Engine)
// يضمن عدم ضياع أي رسالة واتساب أو حدث عند انهيار النظام أو التحول لـ Safe Mode
// يعمل كـ Dead Letter Queue (DLQ) في الذاكرة مع آلية إعادة المحاولة التلقائية

/**
 * ─── هيكل رسالة الـ DLQ ──────────────────────────────────────────────────────
 * نحاكي هنا سلوك Redis FIFO Queue بدون الحاجة لـ Redis في البيئة الحالية
 * يمكن استبداله بـ Redis أو Upstash لاحقاً بتغيير ملف الـ adapter فقط
 */

export interface DLQEntry {
  id: string;
  type: "WHATSAPP_MESSAGE" | "LEAD_QUALIFICATION" | "TELEMETRY_EVENT" | "ASSIGNMENT";
  payload: Record<string, any>;
  tenantId: string;
  createdAt: number;       // Unix timestamp
  retryCount: number;
  lastRetryAt: number | null;
  lastError: string | null;
  status: "PENDING" | "PROCESSING" | "FAILED" | "RESOLVED";
}

// ─── الـ DLQ في الذاكرة (In-Memory FIFO Queue) ───────────────────────────────

class InMemoryDLQ {
  private queue: Map<string, DLQEntry> = new Map();
  private readonly MAX_SIZE: number;
  private readonly MAX_RETRIES: number;

  constructor() {
    this.MAX_SIZE = parseInt(process.env.SAHER_DLQ_MAX_SIZE || "500");
    this.MAX_RETRIES = parseInt(process.env.SAHER_DLQ_MAX_RETRIES || "3");
  }

  /** إضافة رسالة جديدة للـ Queue */
  enqueue(entry: Omit<DLQEntry, "id" | "retryCount" | "lastRetryAt" | "lastError" | "status">): string {
    // إزالة أقدم رسالة إذا امتلأ الـ Queue
    if (this.queue.size >= this.MAX_SIZE) {
      const oldestKey = this.queue.keys().next().value;
      if (oldestKey) this.queue.delete(oldestKey);
    }

    const id = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullEntry: DLQEntry = {
      ...entry,
      id,
      retryCount: 0,
      lastRetryAt: null,
      lastError: null,
      status: "PENDING",
    };

    this.queue.set(id, fullEntry);
    return id;
  }

  /** جلب الرسائل المعلقة للمعالجة */
  getPending(): DLQEntry[] {
    return Array.from(this.queue.values())
      .filter((e) => e.status === "PENDING")
      .sort((a, b) => a.createdAt - b.createdAt); // FIFO
  }

  /** تحديث حالة رسالة */
  updateStatus(id: string, update: Partial<DLQEntry>) {
    const entry = this.queue.get(id);
    if (entry) {
      this.queue.set(id, { ...entry, ...update });
    }
  }

  /** حذف رسائل RESOLVED القديمة */
  cleanup() {
    const oneDayAgo = Date.now() - 86_400_000;
    for (const [key, entry] of this.queue.entries()) {
      if (entry.status === "RESOLVED" && entry.createdAt < oneDayAgo) {
        this.queue.delete(key);
      }
    }
  }

  /** إحصائيات الـ Queue */
  stats() {
    const entries = Array.from(this.queue.values());
    return {
      total: entries.length,
      pending: entries.filter((e) => e.status === "PENDING").length,
      processing: entries.filter((e) => e.status === "PROCESSING").length,
      failed: entries.filter((e) => e.status === "FAILED").length,
      resolved: entries.filter((e) => e.status === "RESOLVED").length,
      maxSize: this.MAX_SIZE,
      maxRetries: this.MAX_RETRIES,
    };
  }

  get maxRetries() { return this.MAX_RETRIES; }
}

// Singleton — نسخة واحدة على مستوى التطبيق
export const saherDLQ = new InMemoryDLQ();

// ─── محرك الاسترداد الرئيسي (Replay Engine) ──────────────────────────────────

export class SaherReplayEngine {
  private isRunning = false;
  private retryIntervalMs: number;
  private processorFn: ((entry: DLQEntry) => Promise<boolean>) | null = null;

  constructor() {
    this.retryIntervalMs = parseInt(
      process.env.SAHER_DLQ_RETRY_INTERVAL_MS || "30000"
    );
  }

  /**
   * تسجيل دالة المعالجة الخارجية
   * يجب أن تُعيد `true` عند النجاح و`false` عند الفشل
   */
  registerProcessor(fn: (entry: DLQEntry) => Promise<boolean>) {
    this.processorFn = fn;
  }

  /**
   * إضافة رسالة فاشلة للـ DLQ لإعادة المحاولة لاحقاً
   */
  addToQueue(
    type: DLQEntry["type"],
    payload: Record<string, any>,
    tenantId: string
  ): string {
    const id = saherDLQ.enqueue({
      type,
      payload,
      tenantId,
      createdAt: Date.now(),
    });

    console.log(`[ReplayEngine] 📦 رسالة مُضافة للـ DLQ: ${id} | النوع: ${type}`);
    return id;
  }

  /**
   * تشغيل دورة إعادة المحاولة (يُستدعى من cron أو يدوياً)
   */
  async runReplayCycle(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    if (this.isRunning) {
      return { processed: 0, succeeded: 0, failed: 0, errors: ["المحرك يعمل بالفعل"] };
    }

    if (!this.processorFn) {
      return { processed: 0, succeeded: 0, failed: 0, errors: ["لم يتم تسجيل دالة المعالجة"] };
    }

    this.isRunning = true;
    const results = { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] };

    try {
      const pendingEntries = saherDLQ.getPending();

      for (const entry of pendingEntries) {
        results.processed++;

        // تحديث الحالة إلى "جاري المعالجة"
        saherDLQ.updateStatus(entry.id, {
          status: "PROCESSING",
          lastRetryAt: Date.now(),
          retryCount: entry.retryCount + 1,
        });

        try {
          const success = await this.processorFn(entry);

          if (success) {
            saherDLQ.updateStatus(entry.id, { status: "RESOLVED" });
            results.succeeded++;
            console.log(`[ReplayEngine] ✅ تمت المعالجة بنجاح: ${entry.id}`);
          } else {
            this.handleFailure(entry, "فشلت دالة المعالجة بدون استثناء", results);
          }
        } catch (err: any) {
          this.handleFailure(entry, err.message, results);
        }

        // تأخير بسيط بين المحاولات لتفادي الضغط على قاعدة البيانات
        await new Promise((r) => setTimeout(r, 200));
      }

      // تنظيف الرسائل القديمة
      saherDLQ.cleanup();

    } finally {
      this.isRunning = false;
    }

    return results;
  }

  private handleFailure(
    entry: DLQEntry,
    errorMsg: string,
    results: { failed: number; errors: string[] }
  ) {
    const newRetryCount = entry.retryCount + 1;
    const isFinalFailure = newRetryCount >= saherDLQ.maxRetries;

    saherDLQ.updateStatus(entry.id, {
      status: isFinalFailure ? "FAILED" : "PENDING",
      lastError: errorMsg,
    });

    results.failed++;
    results.errors.push(`${entry.id}: ${errorMsg}`);

    if (isFinalFailure) {
      console.error(
        `[ReplayEngine] ❌ فشل نهائي بعد ${saherDLQ.maxRetries} محاولات: ${entry.id} | ${errorMsg}`
      );
    } else {
      console.warn(
        `[ReplayEngine] ⚠️ إعادة جدولة: ${entry.id} (محاولة ${newRetryCount}/${saherDLQ.maxRetries})`
      );
    }
  }

  /** إحصائيات الـ Engine والـ DLQ */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasProcessor: !!this.processorFn,
      retryIntervalMs: this.retryIntervalMs,
      queue: saherDLQ.stats(),
    };
  }
}

// Singleton للـ Engine
export const saherReplayEngine = new SaherReplayEngine();
