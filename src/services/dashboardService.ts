import { dashboardDataByRange } from '../mocks/dashboardData'
import type { DashboardData, DateRange, MockScenario } from '../types/dashboard'

const REQUEST_DELAY = 700

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function getMockScenario(): MockScenario {
  if (!import.meta.env.DEV) return 'success'

  const scenario = new URLSearchParams(window.location.search).get('mock')
  return scenario === 'loading' || scenario === 'empty' || scenario === 'error'
    ? scenario
    : 'success'
}

export async function fetchDashboardData(
  dateRange: DateRange,
): Promise<DashboardData | null> {
  const scenario = getMockScenario()

  if (scenario === 'loading') {
    return new Promise(() => undefined)
  }

  await wait(REQUEST_DELAY)

  if (scenario === 'error') {
    throw new Error('Mock 接口暂时不可用，请稍后重试')
  }

  if (scenario === 'empty') {
    return null
  }

  return dashboardDataByRange[dateRange]
}
