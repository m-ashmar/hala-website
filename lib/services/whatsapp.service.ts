import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * WhatsApp Service
 * Handles generation and delivery of OTPs via WhatsApp.
 */
export class WhatsAppService {
  /**
   * Generates a random 6-digit OTP code.
   */
  generateOTP(): string {
    // Generate a secure 6-digit number
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Mock mode is active when:
   *  - WHATSAPP_MOCK=true is set, OR
   *  - No API credentials are configured (auto-fallback so the app never crashes in dev)
   */
  isMockMode(): boolean {
    if (process.env.WHATSAPP_MOCK === 'true') return true;
    // Auto-mock if credentials are absent (safe dev fallback)
    const hasCredentials =
      !!process.env.WHATSAPP_API_TOKEN && !!process.env.WHATSAPP_PHONE_ID;
    return !hasCredentials;
  }

  /**
   * Generates, stores, and sends an OTP to the given phone number.
   * @param phone E.164 formatted phone number (e.g. +963912345678)
   */
  /**
   * Generates, stores, and sends (or mocks) an OTP.
   * Returns the mock code string in mock mode so the API route can surface it to the UI.
   */
  async sendOTP(phone: string): Promise<{ mock: true; code: string } | { mock: false }> {
    const mockMode = this.isMockMode();
    const code = mockMode ? '123456' : this.generateOTP();

    // Store in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.phoneVerification.create({
      data: { phone, code, expiresAt, used: false },
    });

    if (mockMode) {
      console.log(`\n🔐 [WHATSAPP MOCK] OTP for ${phone}: ${code}  (use this to log in)\n`);
      return { mock: true, code };
    }

    // Determine which provider to use based on env vars
    const provider = process.env.WHATSAPP_PROVIDER || 'meta';

    if (provider === 'meta') {
      await this.sendViaMeta(phone, code);
    } else if (provider === 'twilio') {
      await this.sendViaTwilio(phone, code);
    } else if (provider === '360dialog') {
      await this.sendVia360Dialog(phone, code);
    } else {
      throw new Error(`Unknown WhatsApp provider: ${provider}`);
    }

    return { mock: false };
  }

  private async sendViaMeta(phone: string, code: string): Promise<void> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      throw new Error('WhatsApp Meta API credentials are not configured');
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''), // Meta usually wants the number without the +
        type: 'template',
        template: {
          name: 'auth_otp', // Assuming you have a template named auth_otp
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: code }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send WhatsApp message via Meta: ${errorText}`);
    }
  }

  private async sendViaTwilio(phone: string, code: string): Promise<void> {
    // Implementation for Twilio WhatsApp API
    throw new Error('Twilio integration not yet fully implemented');
  }

  private async sendVia360Dialog(phone: string, code: string): Promise<void> {
    // Implementation for 360dialog WhatsApp API
    throw new Error('360dialog integration not yet fully implemented');
  }
}

export const whatsappService = new WhatsAppService();
