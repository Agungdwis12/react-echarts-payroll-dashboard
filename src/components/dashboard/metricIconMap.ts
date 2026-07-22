import {
  BadgePercent,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import type { MetricIconKey } from '../../types/dashboard'

export const metricIconMap: Record<MetricIconKey, LucideIcon> = {
  sales: CircleDollarSign,
  orders: ReceiptText,
  'average-order': BadgePercent,
  conversion: TrendingUp,
  customers: UserPlus,
  'repeat-purchase': RotateCcw,
  refund: CircleDollarSign,
  'gross-margin': BadgePercent,
  inventory: PackageCheck,
  shipping: Clock3,
}
