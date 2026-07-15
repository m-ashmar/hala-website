'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Lang, tr } from '@/app/translations';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (params?.locale as Lang) || 'en';
  const t = (key: Parameters<typeof tr>[0]) => tr(key, lang);
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    // Basic E.164 formatting check
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Default to Syria if no plus, just for UX (adjust as needed)
      formattedPhone = `+963${phone.replace(/^0+/, '')}`;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setPhone(formattedPhone); // store formatted for next step
      // In mock mode the server returns the code directly
      if (data.mockCode) {
        setMockCode(data.mockCode);
        // Auto-fill the OTP fields so the user can just click submit
        setOtp(data.mockCode.split(''));
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn('whatsapp', {
        phone,
        code,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Invalid or expired code. Please try again.');
      }

      if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/">
            <Image
              src="/logo.svg" // Fallback logo if you don't have one, or make sure /logo.svg exists
              alt="Halahello"
              width={48}
              height={48}
              className={styles.logo}
            />
          </Link>
          <h1 className={styles.title}>
            {step === 'phone' ? t('authLoginTitle') : t('authOTPTitle')}
          </h1>
          <p className={styles.subtitle}>
            {step === 'phone' ? t('authLoginSub') : t('authOTPSub')}
          </p>
        </div>

        {error && (
          <div className={styles.error}>
            <span>⚠️</span>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ── Dev mock OTP banner ── */}
        {mockCode && step === 'otp' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12, padding: '12px 16px',
            marginBottom: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.9rem' }}>🔐</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Dev Mode — Mock OTP
              </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.3em', textAlign: 'center', margin: '6px 0 2px' }}>
              {mockCode}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(251,191,36,0.6)', margin: 0, textAlign: 'center' }}>
              Fields pre-filled — click Verify to continue
            </p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="phone" className={styles.label}>
                {t('authPhoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('authPhonePlaceholder')}
                className={styles.input}
                required
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={loading || !phone}
            >
              {loading ? (
                <>
                  <span className={styles.loader}></span> {t('authLoading')}
                </>
              ) : (
                t('authSendOTP')
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className={styles.form}>
            <div className={styles.otpInputContainer} dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`${styles.input} ${styles.otpDigit}`}
                  autoFocus={index === 0}
                  required
                />
              ))}
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? (
                <>
                  <span className={styles.loader}></span> {t('authLoading')}
                </>
              ) : (
                t('authVerifyBtn')
              )}
            </button>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={(e) => {
                setOtp(['', '', '', '', '', '']);
                handleSendOTP(e);
              }}
              disabled={loading}
            >
              {t('authResendBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
