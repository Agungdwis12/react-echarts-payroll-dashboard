import {
  BadgePercent,
  CircleDollarSign,
  ChartNoAxesCombined,
  Clock3,
  JapaneseYen,
  PackageCheck,
  RotateCcw,
  UserRound,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { MetricIconKey } from '../../types/dashboard'

export const metricIconMap: Record<MetricIconKey, LucideIcon> = {
  sales: JapaneseYen,
  orders: WalletCards,
  'average-order': UserRound,
  conversion: ChartNoAxesCombined,
  customers: UserPlus,
  'repeat-purchase': RotateCcw,
  refund: CircleDollarSign,
  'gross-margin': BadgePercent,
  inventory: PackageCheck,
  shipping: Clock3,
}
