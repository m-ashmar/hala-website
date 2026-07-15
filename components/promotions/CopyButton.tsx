'use client';

import React, { useState } from 'react';
import styles from './CopyButton.module.css';

export interface CopyButtonProps {
  code: string;
  label?: string;
  successLabel?: string;
}

export function CopyButton({
  code,
  label = 'Copy',
  successLabel = '✓ Copied!',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button
      id={`copy-${code.replace(/\s+/g, '-').toLowerCase()}`}
      className={[styles.btn, copied ? styles.copied : ''].filter(Boolean).join(' ')}
      onClick={handleCopy}
      aria-live="polite"
      aria-label={copied ? successLabel : `Copy code ${code}`}
    >
      <span className={styles.code}>{code}</span>
      <span className={styles.action}>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        <span>{copied ? successLabel : label}</span>
      </span>
    </button>
  );
}
