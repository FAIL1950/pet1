import type { SendEmailInput } from '../email-sender.js';

export const VERIFY_EMAIL_KIND = 'verify-email';

export interface VerifyEmailData {
  name: string;
  /** Better Auth's verification link. */
  url: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Ukrainian first (the app's default locale), English below; the link is valid for 24 hours. */
export function renderVerifyEmail(
  to: string,
  { name, url }: VerifyEmailData,
): SendEmailInput {
  const safeName = escapeHtml(name || to);
  const safeUrl = escapeHtml(url);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#1b1f1d">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:22px">Підтвердьте пошту</h1>
      <p style="margin:0 0 16px;line-height:1.5">Вітаємо, ${safeName}! Щоб завершити реєстрацію в pet-1, підтвердьте свою електронну адресу.</p>
      <p style="margin:0 0 24px">
        <a href="${safeUrl}" style="display:inline-block;background:#2e7d32;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Підтвердити пошту / Verify email</a>
      </p>
      <p style="margin:0 0 16px;line-height:1.5;color:#5b635f;font-size:14px">Посилання діє 24 години. Якщо ви не реєструвалися — просто проігноруйте цей лист.</p>
      <hr style="border:none;border-top:1px solid #e3e7e5;margin:24px 0">
      <p style="margin:0 0 16px;line-height:1.5;color:#5b635f;font-size:14px">Hi ${safeName}! Confirm your email address to finish signing up for pet-1. The link is valid for 24 hours. If you didn't sign up, ignore this email.</p>
      <p style="margin:0;color:#5b635f;font-size:12px;word-break:break-all">${safeUrl}</p>
    </div>
  </body>
</html>`;

  const text = [
    `Вітаємо, ${name || to}!`,
    'Щоб завершити реєстрацію в pet-1, підтвердьте свою електронну адресу:',
    url,
    'Посилання діє 24 години. Якщо ви не реєструвалися — проігноруйте цей лист.',
    '',
    `Hi ${name || to}! Confirm your email address to finish signing up for pet-1:`,
    url,
    'The link is valid for 24 hours.',
  ].join('\n');

  return {
    to,
    subject: 'Підтвердьте пошту в pet-1 / Verify your email',
    html,
    text,
  };
}
