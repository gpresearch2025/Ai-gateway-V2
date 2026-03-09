import type { AuditEvent } from "../types";
import type { MaybePromise } from "../storage/maybe-promise";

export interface AuditEventFilter {
  orgId?: string;
  type?: AuditEvent["type"];
  requestId?: string;
  userId?: string;
}

export interface AuditRepository {
  insert(event: AuditEvent): MaybePromise<void>;
  findByRequestId(requestId: string): MaybePromise<AuditEvent[]>;
  all(filter?: AuditEventFilter): MaybePromise<AuditEvent[]>;
}
