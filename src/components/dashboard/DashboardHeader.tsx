import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  Gauge,
  Maximize2,
  Users,
} from 'lucide-react'
import type { ViewportState } from '../../constants/dashboard'

const navigation = [
  { label: '销售', icon: BarChart3, active: true },
  { label: '用户', icon: Users },
  { label: '商品', icon: Boxes },
  { label: '订单', icon: FileText },
  { label: '财务', icon: CircleDollarSign },
]

type DashboardHeaderProps = {
  viewport: ViewportState
}

export function DashboardHeader({ viewport }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <strong className="dashboard-brand__title">数据可视化轮播大屏</strong>
        <span className="dashboard-brand__subtitle">REACT DASHBOARD TEMPLATE</span>
      </div>

      <nav className="dashboard-nav" aria-label="大屏页面导航">
        {navigation.map(({ label, icon: Icon, active }) => (
          <div
            className={`dashboard-nav__item${active ? ' dashboard-nav__item--active' : ''}`}
            key={label}
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div className="dashboard-runtime">
        <div className="dashboard-runtime__viewport">
          <div>{viewport.width} × {viewport.height}</div>
          <div>画布缩放 {Math.round(viewport.scale * 100)}%</div>
        </div>
        <div className="dashboard-runtime__badge">
          <Gauge size={16} />
          <span>交互完成</span>
        </div>
        <div className="dashboard-runtime__fullscreen" aria-label="全屏模式视觉占位">
          <Maximize2 size={16} />
        </div>
      </div>
    </header>
  )
}
