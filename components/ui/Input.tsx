'use client';

import React, { useId } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      className = '',
      id: externalId,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const id = externalId ?? autoId;

    return (
      <div
        className={[styles.wrapper, fullWidth ? styles.fullWidth : '']
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
        )}

        <div
          className={[
            styles.inputWrap,
            icon && iconPosition === 'left' ? styles.hasIconLeft : '',
            icon && iconPosition === 'right' ? styles.hasIconRight : '',
            error ? styles.hasError : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {icon && iconPosition === 'left' && (
            <span className={`${styles.icon} ${styles.iconLeft}`} aria-hidden="true">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            className={[styles.input, className].filter(Boolean).join(' ')}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            aria-invalid={!!error}
            {...rest}
          />

          {icon && iconPosition === 'right' && (
            <span className={`${styles.icon} ${styles.iconRight}`} aria-hidden="true">
              {icon}
            </span>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
