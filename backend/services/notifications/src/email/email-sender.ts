/** A rendered email. */
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Outgoing mail, independent of the provider (SPEC §21); see SmtpEmailSender. */
export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}

/** Provide with `{ provide: EMAIL_SENDER, useClass: SmtpEmailSender }`. */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
