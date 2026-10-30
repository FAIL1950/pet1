import {
  EMAIL_VERIFICATION_REQUESTED,
  USER_REGISTERED,
  type DomainEvent,
} from '@app/contracts';
import type { DeliveryService } from '../deliveries/delivery.service.js';
import { VERIFY_EMAIL_KIND } from '../email/templates/verify-email.js';
import { handleAuthEvent } from './handle-auth-event.js';

function event(eventType: string, payload: unknown): DomainEvent<unknown> {
  return {
    eventId: 'e-1',
    eventType,
    aggregateId: 'u-1',
    aggregateType: 'User',
    version: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    payload,
  };
}

describe('handleAuthEvent', () => {
  it('requests a verify-email delivery for EmailVerificationRequested', async () => {
    const request = vi.fn().mockResolvedValue(undefined);

    await handleAuthEvent(
      event(EMAIL_VERIFICATION_REQUESTED, {
        userId: 'u-1',
        email: 'bob@example.com',
        name: 'Bob',
        url: 'http://localhost/verify?token=t',
      }),
      { request } as unknown as DeliveryService,
    );

    expect(request).toHaveBeenCalledWith({
      sourceEventId: 'e-1',
      kind: VERIFY_EMAIL_KIND,
      recipient: 'bob@example.com',
      payload: { name: 'Bob', url: 'http://localhost/verify?token=t' },
    });
  });

  it('ignores other auth events', async () => {
    const request = vi.fn();

    await handleAuthEvent(event(USER_REGISTERED, {}), {
      request,
    } as unknown as DeliveryService);

    expect(request).not.toHaveBeenCalled();
  });
});
