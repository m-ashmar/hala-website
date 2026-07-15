import React from 'react';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  lines = 3,
  className = '',
}: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={[styles.textGroup, className].filter(Boolean).join(' ')}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={styles.shimmer}
            style={{
              height: 14,
              width: i === lines - 1 && lines > 1 ? '65%' : '100%',
              display: 'block',
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    const size = width ?? height ?? 48;
    return (
      <span
        className={[styles.shimmer, className].filter(Boolean).join(' ')}
        style={{ width: size, height: size, borderRadius: '50%', display: 'block' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={[styles.card, className].filter(Boolean).join(' ')}
        style={{ width, height }}
      >
        <span className={styles.shimmer} style={{ height: 180, borderRadius: 12 }} />
        <div className={styles.cardBody}>
          <span className={styles.shimmer} style={{ height: 16, width: '80%', borderRadius: 6 }} />
          <span className={styles.shimmer} style={{ height: 12, width: '55%', borderRadius: 6 }} />
          <span className={styles.shimmer} style={{ height: 20, width: '40%', borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <span
      className={[styles.shimmer, className].filter(Boolean).join(' ')}
      style={{ width, height, display: 'block' }}
    />
  );
}
