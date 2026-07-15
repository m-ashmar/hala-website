import React from 'react';
import styles from './EmptyState.module.css';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {(icon || emoji) && (
        <div className={styles.iconWrap} aria-hidden="true">
          {icon ?? <span className={styles.emoji}>{emoji}</span>}
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {(action || secondaryAction) && (
        <div className={styles.actions}>
          {action && (
            <Button
              variant="primary"
              size="md"
              as={action.href ? 'a' : 'button'}
              href={action.href}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size="md"
              as={secondaryAction.href ? 'a' : 'button'}
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
