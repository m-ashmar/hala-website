'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountNav } from '@/components/layout/AccountNav';
import { Spinner } from '@/components/ui/Spinner';
import styles from './account.layout.module.css';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  const isAr = pathname?.startsWith('/ar') ?? false;
  const locale = isAr ? 'ar' : 'en';

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || status === 'loading') {
    return (
      <div className={styles.loading}>
        <Spinner size={36} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(pathname)}`);
    return null;
  }

  const user = session?.user;
  const whatsappPhone = (user as any)?.whatsappPhone as string | undefined;

  return (
    <div
      className={styles.page}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={styles.layout}>
        <AccountNav
          user={{
            name: user?.name ?? undefined,
            email: user?.email ?? undefined,
            phone: whatsappPhone,
          }}
          locale={locale}
        />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
