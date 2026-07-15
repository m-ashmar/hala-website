import React from 'react';
import styles from './Divider.module.css';

export interface DividerProps {
  label?: string;
  align?: 'left' | 'center' | 'right';
  decorative?: boolean;
  className?: string;
}

export function Divider({
  label,
  align = 'center',
  decorative = false,
  className = '',
}: DividerProps) {
  if (decorative) {
    return (
      <div
        className={[styles.decorative, className].filter(Boolean).join(' ')}
        aria-hidden="true"
      />
    );
  }

  if (label) {
    return (
      <div className={[styles.withLabel, styles[align], className].filter(Boolean).join(' ')}>
        <span className={styles.line} />
        <span className={styles.labelText}>{label}</span>
        <span className={styles.line} />
      </div>
    );
  }

  return (
    <hr className={[styles.hr, className].filter(Boolean).join(' ')} />
  );
}
