/**
 * Email Service
 * Sends transactional emails. Currently logs to console in development
 * (no Resend API key required). When RESEND_API_KEY is added to .env,
 * it switches to real email delivery automatically.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  // Development fallback — log to console
  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.log('\n📧 [Email Service - DEV MODE]');
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log('--- HTML Body ---');
    console.log(payload.html.replace(/<[^>]+>/g, '').trim());
    console.log('---\n');
    return { success: true, id: 'dev-email-' + Date.now() };
  }

  // Production — use Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Halahello <noreply@halahello.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Email Service] Resend error:', error);
      return { success: false };
    }

    const data = await res.json() as { id: string };
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[Email Service] Unexpected error:', err);
    return { success: false };
  }
}

export async function sendContactConfirmation(name: string, email: string, message: string) {
  return sendEmail({
    to: email,
    subject: 'We received your message — Halahello ✨',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #3A2E2A;">
        <div style="background: linear-gradient(135deg, #FAF7F5, #F6EDEE); padding: 40px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 2rem; color: #CFA18D; margin: 0;">Halahello</h1>
          <p style="color: #6B5B55; font-style: italic; margin: 8px 0 0;">Where elegance meets creativity</p>
        </div>
        <h2 style="color: #3A2E2A;">Hello, ${name}! 💌</h2>
        <p>Thank you for reaching out. We've received your message and will get back to you within 1–2 business days.</p>
        <div style="background: #F6EDEE; border-left: 4px solid #CFA18D; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="font-style: italic; color: #6B5B55; margin: 0;">"${message}"</p>
        </div>
        <p>In the meantime, follow us on <a href="https://instagram.com/halahelloo" style="color: #CFA18D;">@halahelloo</a> for the latest collections.</p>
        <p style="color: #6B5B55;">With love,<br/><strong>The Halahello Team</strong></p>
      </div>
    `,
  });
}

export async function sendContactNotificationToAdmin(name: string, email: string, message: string) {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@halahello.com';
  return sendEmail({
    to: adminEmail,
    subject: `📬 New Contact Message from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3A2E2A;">
        <h2>New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${message}</td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendCustomRequestConfirmation(name: string, email: string, details: string) {
  return sendEmail({
    to: email,
    subject: 'Your Custom Plexi Request — Halahello ✨',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #3A2E2A;">
        <div style="background: linear-gradient(135deg, #FAF7F5, #F6EDEE); padding: 40px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 2rem; color: #CFA18D; margin: 0;">Halahello</h1>
          <p style="color: #6B5B55; font-style: italic; margin: 8px 0 0;">Plexi by Halahello</p>
        </div>
        <h2 style="color: #3A2E2A;">Your request is in our hands, ${name}! ✦</h2>
        <p>We've received your custom Plexi request and our artisans are reviewing it. You'll receive a personal quote within 2–3 business days.</p>
        <div style="background: #F6EDEE; border-left: 4px solid #CFA18D; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <strong>Your Request:</strong>
          <p style="color: #6B5B55; margin: 8px 0 0;">${details}</p>
        </div>
        <p>Follow our process:</p>
        <ol style="color: #6B5B55; line-height: 2;">
          <li>✅ Request Submitted</li>
          <li>⏳ Our team reviews and prepares a quote</li>
          <li>📩 You receive a quote via email</li>
          <li>💳 Approve &amp; pay to begin production</li>
          <li>📦 Your piece is crafted and shipped</li>
        </ol>
        <p style="color: #6B5B55;">With love,<br/><strong>The Halahello Artisans</strong></p>
      </div>
    `,
  });
}

export async function sendCustomRequestNotificationToAdmin(
  name: string,
  email: string,
  details: string,
  imageUrls: string[]
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@halahello.com';
  return sendEmail({
    to: adminEmail,
    subject: `✦ New Custom Plexi Request from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3A2E2A;">
        <h2>New Custom Plexi Request</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Details:</td><td style="padding: 8px;">${details}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Images:</td><td style="padding: 8px;">${imageUrls.length > 0 ? imageUrls.join('<br/>') : 'None'}</td></tr>
        </table>
      </div>
    `,
  });
}

// ── Order emails ─────────────────────────────────────────────────────────────
//
// Previously the storefront sent nothing at all when a customer paid: no
// confirmation, no receipt, no shipping notice. These are sent from the order
// lifecycle (see order.service) so both payment rails are covered, and a
// delivery failure never affects order state.

export interface OrderEmailItem {
  title: string;
  quantity: number;
  lineTotal: number;
}

export interface OrderEmailPayload {
  to: string;
  customerName: string;
  referenceCode: string;
  items: OrderEmailItem[];
  totalAmount: number;
  currency: string;
  /** Amount actually captured, when it differs from `currency` (card payments). */
  chargedAmount?: number | null;
  chargedCurrency?: string | null;
  shipping?: {
    fullName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  isAr?: boolean;
}

function money(amount: number, currency: string) {
  return `${amount.toLocaleString()} ${currency}`;
}

function shell(inner: string, isAr: boolean) {
  return `
    <div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #3A2E2A;">
      <div style="background: linear-gradient(135deg, #FAF7F5, #F6EDEE); padding: 40px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 2rem; color: #CFA18D; margin: 0;">Halahello</h1>
        <p style="color: #6B5B55; font-style: italic; margin: 8px 0 0;">
          ${isAr ? 'حيث الأناقة تلتقي بالإبداع' : 'Where elegance meets creativity'}
        </p>
      </div>
      ${inner}
      <p style="color: #6B5B55; margin-top: 32px;">
        ${isAr ? 'مع الحب،' : 'With love,'}<br/><strong>${isAr ? 'فريق هالاهيلو' : 'The Halahello Team'}</strong>
      </p>
    </div>
  `;
}

function itemsTable(items: OrderEmailItem[], currency: string, isAr: boolean) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid rgba(207,161,141,0.2);">
          ${i.title} × ${i.quantity}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid rgba(207,161,141,0.2); text-align: ${isAr ? 'left' : 'right'}; font-weight: 600;">
          ${money(i.lineTotal, currency)}
        </td>
      </tr>`
    )
    .join('');
  return `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${rows}</table>`;
}

function shippingBlock(
  shipping: OrderEmailPayload['shipping'],
  isAr: boolean
) {
  if (!shipping?.addressLine1) return '';
  const lines = [
    shipping.fullName,
    shipping.phone,
    shipping.addressLine1,
    shipping.addressLine2,
    [shipping.city, shipping.country].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join('<br/>');
  return `
    <h3 style="color: #3A2E2A; margin-top: 28px;">${isAr ? 'عنوان الشحن' : 'Shipping to'}</h3>
    <div style="background: #F6EDEE; border-left: 4px solid #CFA18D; padding: 16px 20px; border-radius: 8px; color: #6B5B55; line-height: 1.7;">
      ${lines}
    </div>`;
}

/** Sent once payment is confirmed, on both the ShamCash and Stripe paths. */
export async function sendOrderConfirmation(payload: OrderEmailPayload) {
  const isAr = payload.isAr ?? false;
  const charged =
    payload.chargedAmount && payload.chargedCurrency
      ? `<p style="color: #6B5B55; font-size: 0.9rem;">${
          isAr ? 'المبلغ المدفوع بالبطاقة:' : 'Charged to your card:'
        } <strong>${payload.chargedAmount.toFixed(2)} ${payload.chargedCurrency}</strong></p>`
      : '';

  return sendEmail({
    to: payload.to,
    subject: `${isAr ? 'تم تأكيد طلبك' : 'Order confirmed'} — ${payload.referenceCode}`,
    html: shell(
      `
      <h2 style="color: #3A2E2A;">${isAr ? `شكراً لك، ${payload.customerName}! 💛` : `Thank you, ${payload.customerName}! 💛`}</h2>
      <p>${
        isAr
          ? 'لقد استلمنا طلبك وتم تأكيد الدفع. سنبدأ بتجهيزه فوراً.'
          : "We've received your order and confirmed your payment. We'll start preparing it right away."
      }</p>
      <p style="color: #6B5B55;">
        ${isAr ? 'رقم الطلب:' : 'Order reference:'}
        <strong style="color: #CFA18D; font-family: monospace;">${payload.referenceCode}</strong>
      </p>
      ${itemsTable(payload.items, payload.currency, isAr)}
      <p style="font-size: 1.1rem;">
        <strong>${isAr ? 'الإجمالي:' : 'Total:'} ${money(payload.totalAmount, payload.currency)}</strong>
      </p>
      ${charged}
      ${shippingBlock(payload.shipping, isAr)}
      `,
      isAr
    ),
  });
}

/** Sent when an order is marked shipped or delivered. */
export async function sendOrderStatusUpdate(
  payload: Pick<OrderEmailPayload, 'to' | 'customerName' | 'referenceCode' | 'isAr'> & {
    status: 'SHIPPED' | 'DELIVERED';
  }
) {
  const isAr = payload.isAr ?? false;
  const shipped = payload.status === 'SHIPPED';

  const heading = shipped
    ? isAr ? 'طلبك في الطريق! 📦' : 'Your order is on its way! 📦'
    : isAr ? 'تم توصيل طلبك 🎉' : 'Your order has been delivered 🎉';

  const body = shipped
    ? isAr
      ? 'تم شحن طلبك وهو في طريقه إليك الآن.'
      : 'Your order has shipped and is on its way to you now.'
    : isAr
      ? 'نتمنى أن ينال إعجابك! يسعدنا سماع رأيك.'
      : "We hope you love it! We'd be delighted to hear what you think.";

  return sendEmail({
    to: payload.to,
    subject: `${heading.replace(/[📦🎉]/g, '').trim()} — ${payload.referenceCode}`,
    html: shell(
      `
      <h2 style="color: #3A2E2A;">${heading}</h2>
      <p>${isAr ? `مرحباً ${payload.customerName}،` : `Hi ${payload.customerName},`}</p>
      <p>${body}</p>
      <p style="color: #6B5B55;">
        ${isAr ? 'رقم الطلب:' : 'Order reference:'}
        <strong style="color: #CFA18D; font-family: monospace;">${payload.referenceCode}</strong>
      </p>
      `,
      isAr
    ),
  });
}
