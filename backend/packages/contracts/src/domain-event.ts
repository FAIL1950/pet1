/**
 * Canonical envelope for all domain events published across services.
 * See backend/SPEC.md §7 for the authoritative definition.
 */
export interface DomainEvent<TPayload> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: string;
  payload: TPayload;
}
