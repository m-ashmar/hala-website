'use client';

import React, { useState, useEffect } from 'react';
import styles from './CountdownTimer.module.css';

export interface CountdownTimerProps {
  endDate: string;
  onExpire?: () => void;
  compact?: boolean;
}

interface TimeLeft { d: number; h: number; m: number; s: number; expired: boolean; }

function calc(endDate: string): TimeLeft {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    expired: false,
  };
}

export function CountdownTimer({ endDate, onExpire, compact = false }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeLeft>(() => calc(endDate));

  useEffect(() => {
    if (time.expired) { onExpire?.(); return; }
    const id = setInterval(() => {
      const t = calc(endDate);
      setTime(t);
      if (t.expired) { onExpire?.(); clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [endDate, onExpire, time.expired]);

  const isUrgent = !time.expired && time.d === 0 && time.h < 6;

  if (time.expired) {
    return <span className={styles.expired}>Expired</span>;
  }

  if (compact) {
    const parts: string[] = [];
    if (time.d > 0) parts.push(`${time.d}d`);
    if (time.h > 0 || time.d > 0) parts.push(`${time.h}h`);
    parts.push(`${time.m}m`);
    return (
      <span className={[styles.compact, isUrgent ? styles.urgent : ''].filter(Boolean).join(' ')}>
        ⏱ {parts.join(' ')} left
      </span>
    );
  }

  const segments = [
    { value: time.d, label: 'Days' },
    { value: time.h, label: 'Hrs' },
    { value: time.m, label: 'Min' },
    { value: time.s, label: 'Sec' },
  ].filter(({ value, label }) => label === 'Min' || label === 'Sec' || value > 0);

  return (
    <div className={[styles.wrap, isUrgent ? styles.urgent : ''].filter(Boolean).join(' ')}>
      {segments.map(({ value, label }, i) => (
        <React.Fragment key={label}>
          <div className={styles.segment}>
            <span className={styles.digit}>
              {String(value).padStart(2, '0')}
            </span>
            <span className={styles.segLabel}>{label}</span>
          </div>
          {i < segments.length - 1 && (
            <span className={styles.colon}>:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
