import React from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'glow' | 'flat' | 'glass';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        styles[variant],
        styles[`pad_${padding}`],
        hover ? styles.hover : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
