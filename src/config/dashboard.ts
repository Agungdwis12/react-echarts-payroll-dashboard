function readText(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized || fallback
}

export const dashboardConfig = {
  title: readText(import.meta.env.VITE_DASHBOARD_TITLE, '可视化运营大屏'),
  subtitle: readText(
    import.meta.env.VITE_DASHBOARD_SUBTITLE,
    'REACT ECHARTS DASHBOARD TEMPLATE',
  ),
  pageTitle: readText(
    import.meta.env.VITE_DASHBOARD_PAGE_TITLE,
    'React ECharts Dashboard Template',
  ),
} as const
