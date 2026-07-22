import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  Gauge,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react'
import { dashboardConfig } from '../../config/dashboard'
import type { ViewportState } from '../../constants/dashboard'
import type { DashboardDataStatus } from '../../types/dashboard'

const navigation = [
  { label: '销售', icon: BarChart3, active: true },
  { label: '用户', icon: Users },
  { label: '商品', icon: Boxes },
  { label: '订单', icon: FileText },
  { label: '财务', icon: CircleDollarSign },
]

type DashboardHeaderProps = {
  viewport: ViewportState
  dataStatus: DashboardDataStatus
  isFullscreen: boolean
  isFullscreenSupported: boolean
  toggleFullscreen: () => Promise<void>
}

const statusLabels: Record<DashboardDataStatus, string> = {
  loading: '正在加载数据',
  success: 'Mock 数据已接入',
  empty: '当前数据为空',
  error: '数据请求失败',
}

export function DashboardHeader({
  viewport,
  dataStatus,
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
}: DashboardHeaderProps) {
  const FullscreenIcon = isFullscreen ? Minimize2 : Maximize2

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <strong className="dashboard-brand__title">{dashboardConfig.title}</strong>
        <span className="dashboard-brand__subtitle">{dashboardConfig.subtitle}</span>
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
        <div className={`dashboard-runtime__badge dashboard-runtime__badge--${dataStatus}`}>
          <Gauge size={16} />
          <span>{statusLabels[dataStatus]}</span>
        </div>
        <button
          className="dashboard-runtime__fullscreen"
          type="button"
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          title={isFullscreenSupported ? (isFullscreen ? '退出全屏' : '进入全屏') : '当前浏览器不支持全屏'}
          disabled={!isFullscreenSupported}
          onClick={() => void toggleFullscreen()}
        >
          <FullscreenIcon size={16} />
        </button>
      </div>
    </header>
  )
}
