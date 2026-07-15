import React from 'react';
import styles from './Avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
  online?: boolean;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className = '', online }: AvatarProps) {
  return (
    <div
      className={[styles.avatar, styles[size], className].filter(Boolean).join(' ')}
      title={name}
      aria-label={name ?? 'Avatar'}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? 'User avatar'} className={styles.img} />
      ) : (
        <span className={styles.initials}>{getInitials(name)}</span>
      )}
      {online !== undefined && (
        <span
          className={[styles.dot, online ? styles.online : styles.offline].join(' ')}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
