import { AuditEvent } from "../types";
import { createId } from "../utils/id";
import { AuditEventFilter, AuditRepository } from "./audit-repository";

export class AuditLogService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async write(event: Omit<AuditEvent, "id" | "timestamp">): Promise<AuditEvent> {
    const stored: AuditEvent = {
      id: createId("audit"),
      timestamp: new Date().toISOString(),
      ...event
    };
    await this.auditRepository.insert(stored);
    return stored;
  }

  async findByRequestId(requestId: string): Promise<AuditEvent[]> {
    return await this.auditRepository.findByRequestId(requestId);
  }

  async all(filter?: AuditEventFilter): Promise<AuditEvent[]> {
    return await this.auditRepository.all(filter);
  }
}
