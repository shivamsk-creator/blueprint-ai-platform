import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobEnvelope } from "@blueprint/validation";

export const PRIMARY_QUEUE_NAME = "blueprint_jobs" as const;
export const DLQ_QUEUE_NAME = "blueprint_jobs_dlq" as const;

export interface QueueMessage {
  msgId: number;
  readCount: number;
  enqueuedAt: string;
  visibilityTimeoutAt: string;
  payload: JobEnvelope;
}

export interface JobQueueClient {
  enqueue(payload: JobEnvelope, delaySeconds?: number): Promise<number>;
  read(visibilityTimeoutSeconds: number, quantity: number): Promise<QueueMessage[]>;
  archive(msgId: number): Promise<boolean>;
  moveToDeadLetter(msgId: number, payload: JobEnvelope, reason: string): Promise<number>;
}

export class PgmqQueueClient implements JobQueueClient {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async enqueue(payload: JobEnvelope, delaySeconds = 0): Promise<number> {
    const { data, error } = await this.serviceClient.rpc("blueprint_queue_enqueue", {
      p_queue_name: PRIMARY_QUEUE_NAME,
      p_message: payload,
      p_delay_seconds: delaySeconds,
    });
    if (error) {
      throw new Error(`pgmq enqueue failed: ${error.message}`);
    }
    return Number(data);
  }

  async read(visibilityTimeoutSeconds: number, quantity: number): Promise<QueueMessage[]> {
    const { data, error } = await this.serviceClient.rpc("blueprint_queue_read", {
      p_queue_name: PRIMARY_QUEUE_NAME,
      p_vt_seconds: visibilityTimeoutSeconds,
      p_qty: quantity,
    });
    if (error) {
      throw new Error(`pgmq read failed: ${error.message}`);
    }
    const rows = (data ?? []) as Array<{
      msg_id: number;
      read_ct: number;
      enqueued_at: string;
      vt: string;
      message: JobEnvelope;
    }>;
    return rows.map((row) => ({
      msgId: Number(row.msg_id),
      readCount: Number(row.read_ct),
      enqueuedAt: row.enqueued_at,
      visibilityTimeoutAt: row.vt,
      payload: row.message,
    }));
  }

  async archive(msgId: number): Promise<boolean> {
    const { data, error } = await this.serviceClient.rpc("blueprint_queue_archive", {
      p_queue_name: PRIMARY_QUEUE_NAME,
      p_msg_id: msgId,
    });
    if (error) {
      throw new Error(`pgmq archive failed: ${error.message}`);
    }
    return Boolean(data);
  }

  async moveToDeadLetter(msgId: number, payload: JobEnvelope, reason: string): Promise<number> {
    const { data, error } = await this.serviceClient.rpc("blueprint_queue_enqueue", {
      p_queue_name: DLQ_QUEUE_NAME,
      p_message: { ...payload, _dlqReason: reason, _archivedAt: new Date().toISOString() },
      p_delay_seconds: 0,
    });
    if (error) {
      throw new Error(`pgmq DLQ enqueue failed: ${error.message}`);
    }
    await this.archive(msgId);
    return Number(data);
  }
}

interface InternalQueueRecord {
  msgId: number;
  readCount: number;
  enqueuedAtMs: number;
  visibleAtMs: number;
  payload: JobEnvelope;
  archived: boolean;
}

/**
 * Deterministic pgmq-semantics in-memory queue supporting visibility timeout lease expiry,
 * retry delays, worker crash recovery (JOB-01), and dead-letter archival.
 */
export class InMemoryQueueClient implements JobQueueClient {
  private nextId = 1;
  private readonly records: InternalQueueRecord[] = [];
  public readonly deadLetters: Array<{ msgId: number; payload: JobEnvelope; reason: string }> = [];

  async enqueue(payload: JobEnvelope, delaySeconds = 0): Promise<number> {
    const now = Date.now();
    const msgId = this.nextId++;
    this.records.push({
      msgId,
      readCount: 0,
      enqueuedAtMs: now,
      visibleAtMs: now + delaySeconds * 1000,
      payload,
      archived: false,
    });
    return msgId;
  }

  async read(visibilityTimeoutSeconds: number, quantity: number): Promise<QueueMessage[]> {
    const now = Date.now();
    const claimed: QueueMessage[] = [];
    for (const rec of this.records) {
      if (claimed.length >= quantity) break;
      if (rec.archived || rec.visibleAtMs > now) continue;
      rec.readCount += 1;
      rec.visibleAtMs = now + visibilityTimeoutSeconds * 1000;
      claimed.push({
        msgId: rec.msgId,
        readCount: rec.readCount,
        enqueuedAt: new Date(rec.enqueuedAtMs).toISOString(),
        visibilityTimeoutAt: new Date(rec.visibleAtMs).toISOString(),
        payload: rec.payload,
      });
    }
    return claimed;
  }

  async archive(msgId: number): Promise<boolean> {
    const rec = this.records.find((r) => r.msgId === msgId);
    if (!rec || rec.archived) return false;
    rec.archived = true;
    return true;
  }

  async moveToDeadLetter(msgId: number, payload: JobEnvelope, reason: string): Promise<number> {
    await this.archive(msgId);
    const dlqId = this.nextId++;
    this.deadLetters.push({ msgId: dlqId, payload, reason });
    return dlqId;
  }

  /** Test helper to simulate visibility timeout expiration after a worker crash. */
  expireLeasesForTest(): void {
    const past = Date.now() - 1000;
    for (const rec of this.records) {
      if (!rec.archived) rec.visibleAtMs = past;
    }
  }

  getActiveCount(): number {
    return this.records.filter((r) => !r.archived).length;
  }
}
