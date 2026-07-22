import { useEffect, useState } from 'react'
import { fetchDashboardData } from '../services/dashboardService'
import type { DashboardData, DashboardDataStatus, DateRange } from '../types/dashboard'

type DashboardDataState = {
  data: DashboardData | null
  status: DashboardDataStatus
  error: string | null
}

const initialState: DashboardDataState = {
  data: null,
  status: 'loading',
  error: null,
}

export function useDashboardData(dateRange: DateRange) {
  const [state, setState] = useState<DashboardDataState>(initialState)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let ignore = false

    setState((current) => ({ ...current, status: 'loading', error: null }))

    fetchDashboardData(dateRange)
      .then((data) => {
        if (ignore) return

        setState({
          data,
          status: data ? 'success' : 'empty',
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (ignore) return

        setState((current) => ({
          ...current,
          status: 'error',
          error: error instanceof Error ? error.message : '数据请求失败',
        }))
      })

    return () => {
      ignore = true
    }
  }, [dateRange, retryCount])

  return {
    ...state,
    retry: () => setRetryCount((count) => count + 1),
  }
}
