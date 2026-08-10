import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Email template escaping.
 *
 * The defect these pin: every template builds raw HTML with template literals,
 * and several interpolated values arrive straight from a public form — the
 * contact form's name and message, a custom request's details. Unescaped, a
 * submitter could inject styled markup and links into an email sent from the
 * shop's own verified domain to the person with admin access: a phishing
 * message wearing the brand's trust.
 */

const sent: { to: string; subject: string; html: string }[] = [];

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'x' }) })));

vi.mock('@/lib/logger', () => ({ logger: { info: () => {}, error: () => {}, warn: () => {} } }));

const svc = await import('./services/email.service');

// The service logs instead of sending when RESEND_API_KEY is absent, so capture
// what it would have produced by spying on console output is brittle. Instead
// exercise the exported senders and assert on the payload via a fetch spy.
beforeEach(() => {
  sent.length = 0;
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ id: 'x' }) };
    }
  );
});

const XSS = '<img src=x onerror=alert(1)>';
const PHISH = '<a href="https://evil.com">Verify your account</a>';

describe('contact emails', () => {
  it('escapes the submitter name in the admin notification', async () => {
    await svc.sendContactNotificationToAdmin(XSS, 'a@b.com', 'hello');
    const html = sent.at(-1)!.html;
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('escapes an injected phishing link in the message body', async () => {
    await svc.sendContactNotificationToAdmin('Ann', 'a@b.com', PHISH);
    const html = sent.at(-1)!.html;
    expect(html).not.toContain('<a href="https://evil.com"');
    expect(html).toContain('&lt;a href=');
  });

  it('escapes the message in the customer confirmation too', async () => {
    await svc.sendContactConfirmation('Ann', 'a@b.com', XSS);
    const html = sent.at(-1)!.html;
    expect(html).not.toContain('<img src=x');
  });
});

describe('subject headers', () => {
  it('strips CR/LF so extra headers cannot be appended', async () => {
    await svc.sendContactNotificationToAdmin('Ann\r\nBcc: evil@evil.com', 'a@b.com', 'hi');
    const subject = sent.at(-1)!.subject;
    expect(subject).not.toContain('\n');
    expect(subject).not.toContain('\r');
  });

  it('does NOT html-escape subjects — they are not HTML', async () => {
    // Escaping here would show a literal &amp; to the reader.
    await svc.sendContactNotificationToAdmin('Tom & Jerry', 'a@b.com', 'hi');
    expect(sent.at(-1)!.subject).toContain('Tom & Jerry');
  });
});

describe('custom request emails', () => {
  it('escapes details in the admin notification', async () => {
    await svc.sendCustomRequestNotificationToAdmin('Ann', 'a@b.com', XSS, []);
    const html = sent.at(-1)!.html;
    expect(html).not.toContain('<img src=x');
  });
});
