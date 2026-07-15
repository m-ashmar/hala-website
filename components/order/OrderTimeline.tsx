import React from 'react';
import styles from './OrderTimeline.module.css';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface TimelineEvent {
  id: string;
  status: string;
  note?: string;
  createdAt: string;
}

export interface OrderTimelineProps {
  events: TimelineEvent[];
  locale?: string;
}

export function OrderTimeline({ events, locale = 'en' }: OrderTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <ol className={styles.timeline}>
      {sorted.map((event, index) => {
        const isFirst = index === 0;
        const date = new Date(event.createdAt);
        const dateStr = date.toLocaleDateString(locale, {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        const timeStr = date.toLocaleTimeString(locale, {
          hour: '2-digit', minute: '2-digit',
        });

        return (
          <li key={event.id} className={[styles.item, isFirst ? styles.current : ''].filter(Boolean).join(' ')}>
            {/* Timeline rail */}
            <div className={styles.rail}>
              <div className={[styles.dot, isFirst ? styles.dotActive : styles.dotPast].join(' ')}>
                {isFirst ? (
                  <span className={styles.activePing} />
                ) : (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                    <path d="M2 4l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                )}
              </div>
              {index < sorted.length - 1 && <div className={styles.line} />}
            </div>

            {/* Content */}
            <div className={styles.content}>
              <div className={styles.contentHeader}>
                <OrderStatusBadge status={event.status} locale={locale} size="sm" dot={false} />
                <span className={styles.time}>{dateStr} · {timeStr}</span>
              </div>
              {event.note && (
                <p className={styles.note}>{event.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
