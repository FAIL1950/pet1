import { listEnv, optionalEnv, requireEnv } from '@app/common';

const smtpPort = optionalEnv('SMTP_PORT');

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  kafka: {
    brokers: listEnv('KAFKA_BROKERS'),
    clientId: requireEnv('KAFKA_CLIENT_ID'),
    /** Every replica joins this group, so each auth event is handled by exactly one of them. */
    groupId: requireEnv('KAFKA_GROUP_ID'),
  },
  /**
   * Outgoing mail (Gmail: smtp.gmail.com:465 with an app password). Optional so the service
   * still starts without the `smtp` Secret; sends then fail and wait for a retry.
   */
  smtp: {
    host: optionalEnv('SMTP_HOST'),
    port: smtpPort ? Number(smtpPort) : 465,
    user: optionalEnv('SMTP_USER'),
    pass: optionalEnv('SMTP_PASS'),
    from: optionalEnv('MAIL_FROM') ?? optionalEnv('SMTP_USER'),
  },
};
