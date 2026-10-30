import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { config } from '../config.js';
import type { EmailSender, SendEmailInput } from './email-sender.js';

/** SMTP via nodemailer (Gmail: smtp.gmail.com:465, an app password as SMTP_PASS). */
@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly transport: Transporter | null;

  constructor() {
    const { host, port, user, pass } = config.smtp;
    this.transport =
      host && user && pass
        ? createTransport({
            host,
            port,
            // 465 is implicit TLS; other ports (587) upgrade with STARTTLS.
            secure: port === 465,
            auth: { user, pass },
          })
        : null;
  }

  async send({ to, subject, html, text }: SendEmailInput): Promise<void> {
    if (!this.transport || !config.smtp.from) {
      // Not fatal: the delivery is retried, and sent once the `smtp` Secret is configured.
      throw new Error(
        'SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)',
      );
    }
    await this.transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text,
    });
  }
}
