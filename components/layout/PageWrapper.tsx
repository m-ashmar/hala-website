import React from 'react';
import styles from './PageWrapper.module.css';

export type PageWrapperWidth = 'narrow' | 'default' | 'wide' | 'full';

export interface PageWrapperProps {
  children: React.ReactNode;
  width?: PageWrapperWidth;
  padTop?: boolean;
  padBottom?: boolean;
  className?: string;
  as?: React.ElementType;
}

export function PageWrapper({
  children,
  width = 'default',
  padTop = true,
  padBottom = true,
  className = '',
  as: Tag = 'div',
}: PageWrapperProps) {
  const cls = [
    styles.wrapper,
    styles[width],
    padTop    ? styles.padTop    : '',
    padBottom ? styles.padBottom : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={cls}>{children}</Tag>;
}
