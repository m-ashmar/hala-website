import styles from './AnnouncementBar.module.css';

export interface AnnouncementBarProps {
  text?: string | null;
  isAr?: boolean;
}

export const ANNOUNCEMENT_BAR_HEIGHT = 40;

export function AnnouncementBar({ text, isAr }: AnnouncementBarProps) {
  if (!text) return null;

  return (
    <div className={styles.bar} dir={isAr ? 'rtl' : 'ltr'}>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
