'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition — wraps page content in a smooth fade-in animation
 * on each route change. Uses CSS animations for zero-bundle-size
 * (no framer-motion dependency needed).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reset animation so it replays on each route change
    el.style.animation = 'none';
    // Force reflow
    void el.offsetHeight;
    el.style.animation = '';
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      style={{
        animation: 'pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
