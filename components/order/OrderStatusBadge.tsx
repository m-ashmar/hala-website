import React from 'react';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_SHIPPING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_PAYMENT'
  | 'REFUNDED';

interface StatusConfig {
  label: string;
  labelAr: string;
  variant: BadgeVariant;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  PENDING:            { label: 'Pending Payment', labelAr: 'انتظار الدفع',   variant: 'warning' },
  CONFIRMED:          { label: 'Confirmed',       labelAr: 'مؤكد',           variant: 'success' },
  PREPARING:          { label: 'Preparing',       labelAr: 'قيد التحضير',    variant: 'info'    },
  READY_FOR_SHIPPING: { label: 'Ready to Ship',   labelAr: 'جاهز للشحن',     variant: 'purple'  },
  SHIPPED:            { label: 'Shipped',         labelAr: 'تم الشحن',       variant: 'info'    },
  DELIVERED:          { label: 'Delivered',       labelAr: 'تم التسليم',     variant: 'success' },
  CANCELLED:          { label: 'Cancelled',       labelAr: 'ملغي',           variant: 'danger'  },
  FAILED_PAYMENT:     { label: 'Payment Failed',  labelAr: 'فشل الدفع',      variant: 'danger'  },
  REFUNDED:           { label: 'Refunded',        labelAr: 'مسترجع',         variant: 'default' },
};

export interface OrderStatusBadgeProps {
  status: string;
  locale?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function OrderStatusBadge({
  status,
  locale = 'en',
  size = 'md',
  dot = true,
}: OrderStatusBadgeProps) {
  const isAr = locale === 'ar';
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    labelAr: status,
    variant: 'default' as BadgeVariant,
  };

  return (
    <Badge variant={cfg.variant} size={size} dot={dot}>
      {isAr ? cfg.labelAr : cfg.label}
    </Badge>
  );
}
