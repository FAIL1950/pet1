import { renderVerifyEmail } from './verify-email.js';

const url =
  'http://localhost/api/auth/verify-email?token=abc&callbackURL=%2Fauth%2Fverified';

describe('renderVerifyEmail', () => {
  it('addresses the recipient and links to the verification URL', () => {
    const email = renderVerifyEmail('bob@example.com', { name: 'Bob', url });

    expect(email.to).toBe('bob@example.com');
    expect(email.subject).toContain('Verify your email');
    expect(email.text).toContain(url);
    expect(email.html).toContain(
      'href="http://localhost/api/auth/verify-email?token=abc&amp;callbackURL=%2Fauth%2Fverified"',
    );
    expect(email.html).toContain('Bob');
  });

  it('escapes the name in HTML', () => {
    const email = renderVerifyEmail('x@example.com', {
      name: '<script>alert(1)</script>',
      url,
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('falls back to the address when the name is empty', () => {
    expect(
      renderVerifyEmail('x@example.com', { name: '', url }).text,
    ).toContain('x@example.com');
  });
});
