import type {
  Delivery,
  EmailDeliveriesRepository,
} from '../database/repositories/email-deliveries.repository.js';
import type { EmailSender } from '../email/email-sender.js';
import { VERIFY_EMAIL_KIND } from '../email/templates/verify-email.js';
import {
  DELIVERY_LEASE_MS,
  DeliveryService,
  RETRY_DELAYS_MS,
} from './delivery.service.js';

const delivery: Delivery = {
  id: 'd-1',
  kind: VERIFY_EMAIL_KIND,
  recipient: 'bob@example.com',
  attempts: 0,
  payload: { name: 'Bob', url: 'http://localhost/verify?token=t' },
};

function setup(send = vi.fn().mockResolvedValue(undefined)) {
  const deliveries = {
    claim: vi.fn().mockResolvedValue(delivery),
    markSent: vi.fn().mockResolvedValue(undefined),
    scheduleRetry: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
  const service = new DeliveryService(
    deliveries as unknown as EmailDeliveriesRepository,
    { send } as EmailSender,
  );
  return { service, deliveries, send };
}

describe('DeliveryService', () => {
  afterEach(() => vi.useRealTimers());

  it('claims the delivery, sends the rendered email and marks it sent', async () => {
    const { service, deliveries, send } = setup();
    const request = {
      sourceEventId: 'e-1',
      kind: VERIFY_EMAIL_KIND,
      recipient: 'bob@example.com',
      payload: delivery.payload,
    };

    await service.request(request);

    expect(deliveries.claim).toHaveBeenCalledWith(request, DELIVERY_LEASE_MS);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'bob@example.com' }),
    );
    expect(send.mock.calls[0][0].text).toContain(delivery.payload.url);
    expect(deliveries.markSent).toHaveBeenCalledWith('d-1');
  });

  it('sends nothing for an already claimed (redelivered) event', async () => {
    const { service, deliveries, send } = setup();
    deliveries.claim.mockResolvedValue(null);

    await service.request({
      sourceEventId: 'e-1',
      kind: VERIFY_EMAIL_KIND,
      recipient: 'bob@example.com',
      payload: {},
    });

    expect(send).not.toHaveBeenCalled();
  });

  it('schedules a retry with the backoff for the attempt', async () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
    const { service, deliveries } = setup(
      vi.fn().mockRejectedValue(new Error('535 bad credentials')),
    );

    await service.deliver({ ...delivery, attempts: 2 });

    expect(deliveries.scheduleRetry).toHaveBeenCalledWith(
      'd-1',
      '535 bad credentials',
      new Date(Date.now() + RETRY_DELAYS_MS[2]),
    );
    expect(deliveries.markSent).not.toHaveBeenCalled();
  });

  it('gives up after the last retry', async () => {
    const { service, deliveries } = setup(
      vi.fn().mockRejectedValue(new Error('down')),
    );

    await service.deliver({
      ...delivery,
      attempts: RETRY_DELAYS_MS.length,
    });

    expect(deliveries.markFailed).toHaveBeenCalledWith('d-1', 'down');
    expect(deliveries.scheduleRetry).not.toHaveBeenCalled();
  });

  it('retries unknown kinds like any failure instead of throwing', async () => {
    const { service, deliveries, send } = setup();

    await expect(
      service.deliver({ ...delivery, kind: 'nope' }),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(deliveries.scheduleRetry).toHaveBeenCalled();
  });
});
