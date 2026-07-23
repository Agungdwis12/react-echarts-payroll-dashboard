import {
  Boxes,
  CircleDollarSign,
  Clock3,
  FileText,
  Maximize2,
  Minimize2,
  MonitorPlay,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { dashboardConfig } from '../../config/dashboard'
import type { ViewportState } from '../../constants/dashboard'
import type { DashboardDataStatus } from '../../types/dashboard'

const navigation = [
  { label: '销售', icon: ShoppingCart, active: true },
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

const showDevelopmentInfo = import.meta.env.DEV
  && new URLSearchParams(window.location.search).has('debug')

function formatCurrentTime(date: Date) {
  const datePart = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replaceAll('/', '-')
  const timePart = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

  return `${datePart} ${timePart}`
}

export function DashboardHeader({
  viewport,
  dataStatus,
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
}: DashboardHeaderProps) {
  const FullscreenIcon = isFullscreen ? Minimize2 : Maximize2
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <strong className="dashboard-brand__title">{dashboardConfig.title}</strong>
        <button className="dashboard-brand__switch" type="button">
          <MonitorPlay size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>轮播切换大屏</span>
        </button>
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
        <time className="dashboard-runtime__clock" dateTime={currentTime.toISOString()}>
          <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>{formatCurrentTime(currentTime)}</span>
        </time>
        {showDevelopmentInfo && (
          <div className="dashboard-runtime__debug">
            <div className="dashboard-runtime__viewport">
              <div>{viewport.width} × {viewport.height}</div>
              <div>画布缩放 {Math.round(viewport.scale * 100)}%</div>
            </div>
            <div className={`dashboard-runtime__badge dashboard-runtime__badge--${dataStatus}`}>
              <span>{statusLabels[dataStatus]}</span>
            </div>
          </div>
        )}
        <button
          className="dashboard-runtime__fullscreen"
          type="button"
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          title={isFullscreenSupported ? (isFullscreen ? '退出全屏' : '进入全屏') : '当前浏览器不支持全屏'}
          disabled={!isFullscreenSupported}
          onClick={() => void toggleFullscreen()}
        >
          <span>{isFullscreen ? '退出全屏' : '全屏模式'}</span>
          <FullscreenIcon size={16} />
        </button>
      </div>
    </header>
  )
}
