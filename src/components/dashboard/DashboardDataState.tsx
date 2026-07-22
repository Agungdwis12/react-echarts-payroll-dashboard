import { CloudOff, DatabaseZap, LoaderCircle, RotateCw } from 'lucide-react'
import type { DashboardDataStatus } from '../../types/dashboard'

type DashboardDataStateProps = {
  status: Exclude<DashboardDataStatus, 'success'>
  error: string | null
  onRetry: () => void
}

const stateContent = {
  loading: {
    title: '正在加载销售数据',
    description: 'Mock 接口正在返回当前日期范围的数据，请稍候。',
    icon: LoaderCircle,
  },
  empty: {
    title: '当前范围暂无数据',
    description: '页面结构没有出错，只是接口返回了一份空结果。',
    icon: DatabaseZap,
  },
  error: {
    title: '数据加载失败',
    description: '请求没有成功返回，请检查接口状态后重新尝试。',
    icon: CloudOff,
  },
}

export function DashboardDataState({
  status,
  error,
  onRetry,
}: DashboardDataStateProps) {
  const content = stateContent[status]
  const Icon = content.icon

  return (
    <div
      className={`dashboard-data-state dashboard-data-state--${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="dashboard-data-state__icon" aria-hidden="true">
        <Icon className={status === 'loading' ? 'is-spinning' : undefined} size={30} />
      </span>
      <strong>{content.title}</strong>
      <p>{error ?? content.description}</p>
      {status === 'error' && (
        <button type="button" onClick={onRetry}>
          <RotateCw size={15} aria-hidden="true" />
          重新加载
        </button>
      )}
    </div>
  )
}
