import React from 'react';
import styles from './OrderProgressBar.module.css';

const STEPS = [
  { key: 'CONFIRMED',          label: 'Confirmed',    labelAr: 'مؤكد'         },
  { key: 'PREPARING',          label: 'Preparing',    labelAr: 'قيد التحضير'  },
  { key: 'READY_FOR_SHIPPING', label: 'Ready',        labelAr: 'جاهز'         },
  { key: 'SHIPPED',            label: 'Shipped',      labelAr: 'تم الشحن'     },
  { key: 'DELIVERED',          label: 'Delivered',    labelAr: 'مسلّم'         },
];

const STATUS_STEP: Record<string, number> = {
  PENDING:            -1,
  CONFIRMED:           0,
  PREPARING:           1,
  READY_FOR_SHIPPING:  2,
  SHIPPED:             3,
  DELIVERED:           4,
  CANCELLED:          -2,
  FAILED_PAYMENT:     -2,
  REFUNDED:           -2,
};

export interface OrderProgressBarProps {
  status: string;
  locale?: string;
}

export function OrderProgressBar({ status, locale = 'en' }: OrderProgressBarProps) {
  const isAr = locale === 'ar';
  const currentStep = STATUS_STEP[status] ?? -1;

  // Don't render progress bar for terminal negative states
  if (currentStep === -2) return null;

  return (
    <div className={styles.wrap} role="list" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const isDone    = index < currentStep;
        const isActive  = index === currentStep;
        const isPending = index > currentStep;

        return (
          <React.Fragment key={step.key}>
            {/* Step node */}
            <div
              className={[
                styles.step,
                isDone   ? styles.done   : '',
                isActive ? styles.active : '',
                isPending ? styles.pending : '',
              ].filter(Boolean).join(' ')}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className={styles.node}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className={styles.nodeNum}>{index + 1}</span>
                )}
              </div>
              <span className={styles.label}>
                {isAr ? step.labelAr : step.label}
              </span>
            </div>

            {/* Connector */}
            {index < STEPS.length - 1 && (
              <div className={[styles.connector, isDone ? styles.connectorFilled : ''].filter(Boolean).join(' ')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
