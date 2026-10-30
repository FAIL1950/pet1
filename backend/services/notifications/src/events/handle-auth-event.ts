import {
  EMAIL_VERIFICATION_REQUESTED,
  type DomainEvent,
  type EmailVerificationRequestedEvent,
} from '@app/contracts';
import type { DeliveryService } from '../deliveries/delivery.service.js';
import { VERIFY_EMAIL_KIND } from '../email/templates/verify-email.js';

/** Turns an auth event into the email it asks for; other events need no email. */
export async function handleAuthEvent(
  event: DomainEvent<unknown>,
  delivery: DeliveryService,
): Promise<void> {
  if (event.eventType !== EMAIL_VERIFICATION_REQUESTED) return;
  const { payload } = event as EmailVerificationRequestedEvent;
  await delivery.request({
    sourceEventId: event.eventId,
    kind: VERIFY_EMAIL_KIND,
    recipient: payload.email,
    payload: { name: payload.name, url: payload.url },
  });
}
