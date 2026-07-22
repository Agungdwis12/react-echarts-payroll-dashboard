import type { DashboardData, DateRange } from '../types/dashboard'

const todayData: DashboardData = {
  rangeLabel: '今日',
  updatedAt: '14:23:45',
  summaryMetrics: [
    { id: 'sales-amount', label: '销售额（元）', value: 8756.32, fractionDigits: 2, unit: '万', change: '+8.6%', tone: 'positive', accent: '#239dff', icon: 'sales' },
    { id: 'order-count', label: '订单量（笔）', value: 23856, change: '+6.3%', tone: 'positive', accent: '#8d68ff', icon: 'orders' },
    { id: 'average-order-value', label: '客单价（元）', value: 98.12, fractionDigits: 2, change: '+6.6%', tone: 'positive', accent: '#24c98a', icon: 'average-order' },
    { id: 'conversion-rate', label: '转化率', value: 3.62, fractionDigits: 2, unit: '%', change: '+0.42pt', tone: 'positive', accent: '#f4a928', icon: 'conversion' },
  ],
  salesTrend: {
    categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    currentLabel: '今日销售额',
    previousLabel: '昨日销售额',
    current: [120, 250, 470, 680, 820, 910, 1000],
    previous: [90, 180, 300, 450, 560, 730, 800],
  },
  channels: [
    { name: '展会现场', value: 3248.99, color: '#168dff' },
    { name: '线上商城', value: 2180.32, color: '#15c5de' },
    { name: '代理分销', value: 1532.36, color: '#78c63c' },
    { name: '企业直销', value: 1024.49, color: '#8a68e8' },
    { name: '其他渠道', value: 770.16, color: '#f1a72c' },
  ],
  ranking: [
    { name: '智能制造博览会', amount: 1236.52, share: 14.1 },
    { name: '医疗健康展', amount: 1021.34, share: 11.7 },
    { name: '消费电子展', amount: 986.71, share: 11.3 },
    { name: '新能源汽车展', amount: 862.15, share: 9.8 },
    { name: '全球供应链展', amount: 754.49, share: 8.6 },
  ],
  keyMetrics: [
    { id: 'new-customers', label: '新客数（人）', value: 5678, change: '+9.2%', tone: 'positive', icon: 'customers', accent: '#269dff', sparkline: [12, 18, 15, 24, 20, 29, 25, 32, 27, 35, 31, 38] },
    { id: 'repeat-purchase-rate', label: '复购率', value: 27.3, fractionDigits: 1, unit: '%', change: '+1.8pt', tone: 'positive', icon: 'repeat-purchase', accent: '#1bc5bd', sparkline: [22, 25, 21, 29, 26, 31, 27, 34, 30, 36, 33, 40] },
    { id: 'refund-amount', label: '退款金额（元）', value: 186542, change: '-5.6%', tone: 'negative', icon: 'refund', accent: '#ff5664', sparkline: [31, 28, 35, 30, 41, 33, 29, 36, 32, 38, 30, 34] },
    { id: 'gross-margin', label: '毛利率', value: 45.7, fractionDigits: 1, unit: '%', change: '+0.9pt', tone: 'positive', icon: 'gross-margin', accent: '#35c968', sparkline: [18, 21, 20, 26, 24, 31, 29, 34, 32, 37, 35, 39] },
    { id: 'inventory-turnover', label: '库存周转率', value: 8.2, fractionDigits: 1, change: '+0.3', tone: 'positive', icon: 'inventory', accent: '#f0a928', sparkline: [16, 23, 19, 27, 22, 31, 26, 35, 29, 37, 32, 40] },
    { id: 'average-shipping-time', label: '平均发货时效（天）', value: 1.3, fractionDigits: 1, change: '-0.1', tone: 'negative', icon: 'shipping', accent: '#9c67f5', sparkline: [28, 24, 30, 26, 33, 27, 35, 31, 36, 29, 32, 27] },
  ],
}

const sevenDaysData: DashboardData = {
  ...todayData,
  rangeLabel: '近 7 天',
  updatedAt: '刚刚更新',
  summaryMetrics: [
    { ...todayData.summaryMetrics[0], value: 61294.24, change: '+12.4%' },
    { ...todayData.summaryMetrics[1], value: 164380, change: '+9.8%' },
    { ...todayData.summaryMetrics[2], value: 96.85, change: '+3.2%' },
    { ...todayData.summaryMetrics[3], value: 3.74, change: '+0.31pt' },
  ],
  salesTrend: {
    categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    currentLabel: '本周期销售额',
    previousLabel: '上周期销售额',
    current: [7200, 8150, 7860, 9020, 9650, 10180, 9234],
    previous: [6410, 7060, 7320, 7980, 8460, 8910, 8396],
  },
  channels: [
    { name: '展会现场', value: 22985.34, color: '#168dff' },
    { name: '线上商城', value: 15124.90, color: '#15c5de' },
    { name: '代理分销', value: 10582.18, color: '#78c63c' },
    { name: '企业直销', value: 7355.47, color: '#8a68e8' },
    { name: '其他渠道', value: 5246.35, color: '#f1a72c' },
  ],
  ranking: [
    { name: '未来交通科技展', amount: 8636.25, share: 14.1 },
    { name: '智能制造博览会', amount: 7412.80, share: 12.1 },
    { name: '医疗健康展', amount: 6865.42, share: 11.2 },
    { name: '消费电子展', amount: 6129.35, share: 10.0 },
    { name: '新能源产业展', amount: 5271.30, share: 8.6 },
  ],
  keyMetrics: [
    { ...todayData.keyMetrics[0], value: 38642, change: '+11.6%', sparkline: [18, 21, 24, 22, 28, 31, 35] },
    { ...todayData.keyMetrics[1], value: 28.6, change: '+2.1pt', sparkline: [24, 25, 27, 26, 29, 31, 33] },
    { ...todayData.keyMetrics[2], value: 1280426, change: '-3.8%', sparkline: [38, 34, 36, 31, 30, 28, 29] },
    { ...todayData.keyMetrics[3], value: 46.2, change: '+1.2pt', sparkline: [31, 33, 32, 36, 37, 39, 41] },
    { ...todayData.keyMetrics[4], value: 8.6, change: '+0.5', sparkline: [26, 28, 27, 31, 33, 35, 38] },
    { ...todayData.keyMetrics[5], value: 1.2, change: '-0.2', sparkline: [36, 34, 32, 31, 29, 27, 26] },
  ],
}

const thirtyDaysData: DashboardData = {
  ...todayData,
  rangeLabel: '近 30 天',
  updatedAt: '刚刚更新',
  summaryMetrics: [
    { ...todayData.summaryMetrics[0], value: 268431.76, change: '+18.7%' },
    { ...todayData.summaryMetrics[1], value: 718925, change: '+15.2%' },
    { ...todayData.summaryMetrics[2], value: 99.43, change: '+4.1%' },
    { ...todayData.summaryMetrics[3], value: 3.88, change: '+0.56pt' },
  ],
  salesTrend: {
    categories: ['第 1 周', '第 2 周', '第 3 周', '第 4 周', '本周'],
    currentLabel: '近 30 天销售额',
    previousLabel: '前 30 天销售额',
    current: [48200, 51680, 54860, 58340, 55352],
    previous: [40120, 43850, 46560, 48120, 47490],
  },
  channels: [
    { name: '展会现场', value: 102345.68, color: '#168dff' },
    { name: '线上商城', value: 66102.42, color: '#15c5de' },
    { name: '代理分销', value: 45221.80, color: '#78c63c' },
    { name: '企业直销', value: 32240.16, color: '#8a68e8' },
    { name: '其他渠道', value: 22521.70, color: '#f1a72c' },
  ],
  ranking: [
    { name: '未来交通科技展', amount: 38628.42, share: 14.4 },
    { name: '智能制造博览会', amount: 32418.76, share: 12.1 },
    { name: '国际医疗健康展', amount: 29736.58, share: 11.1 },
    { name: '消费电子创新展', amount: 26329.14, share: 9.8 },
    { name: '新能源产业展', amount: 23085.13, share: 8.6 },
  ],
  keyMetrics: [
    { ...todayData.keyMetrics[0], value: 165892, change: '+17.3%', sparkline: [20, 24, 26, 29, 32, 36, 39, 43] },
    { ...todayData.keyMetrics[1], value: 29.4, change: '+2.8pt', sparkline: [26, 27, 29, 28, 31, 33, 35, 37] },
    { ...todayData.keyMetrics[2], value: 5386240, change: '-7.2%', sparkline: [42, 39, 37, 35, 34, 31, 29, 27] },
    { ...todayData.keyMetrics[3], value: 47.1, change: '+1.6pt', sparkline: [29, 31, 34, 33, 36, 38, 41, 44] },
    { ...todayData.keyMetrics[4], value: 9.1, change: '+0.8', sparkline: [24, 27, 29, 28, 32, 35, 38, 41] },
    { ...todayData.keyMetrics[5], value: 1.1, change: '-0.3', sparkline: [38, 36, 34, 32, 30, 28, 26, 24] },
  ],
}

const customData: DashboardData = {
  ...todayData,
  rangeLabel: '自定义：近 14 天',
  updatedAt: '刚刚更新',
  summaryMetrics: [
    { ...todayData.summaryMetrics[0], value: 128604.90, change: '+14.8%' },
    { ...todayData.summaryMetrics[1], value: 340216, change: '+11.9%' },
    { ...todayData.summaryMetrics[2], value: 100.26, change: '+5.3%' },
    { ...todayData.summaryMetrics[3], value: 4.02, change: '+0.63pt' },
  ],
  salesTrend: {
    categories: ['07-09', '07-11', '07-13', '07-15', '07-17', '07-19', '07-22'],
    currentLabel: '所选区间销售额',
    previousLabel: '上一区间销售额',
    current: [15200, 16840, 17560, 18420, 19280, 20860, 20445],
    previous: [12800, 14360, 14920, 15880, 16410, 17260, 17940],
  },
  channels: [
    { name: '展会现场', value: 49580.20, color: '#168dff' },
    { name: '线上商城', value: 31524.75, color: '#15c5de' },
    { name: '代理分销', value: 21420.36, color: '#78c63c' },
    { name: '企业直销', value: 15340.29, color: '#8a68e8' },
    { name: '其他渠道', value: 10739.30, color: '#f1a72c' },
  ],
  ranking: [
    { name: '未来交通科技展', amount: 18372.40, share: 14.3 },
    { name: '智能制造博览会', amount: 15748.55, share: 12.2 },
    { name: '医疗健康展', amount: 14146.54, share: 11.0 },
    { name: '消费电子展', amount: 12860.49, share: 10.0 },
    { name: '新能源产业展', amount: 11060.02, share: 8.6 },
  ],
  keyMetrics: [
    { ...todayData.keyMetrics[0], value: 80214, change: '+13.1%', sparkline: [20, 23, 26, 25, 30, 34, 37, 41] },
    { ...todayData.keyMetrics[1], value: 30.1, change: '+3.2pt', sparkline: [27, 29, 28, 32, 34, 36, 39, 42] },
    { ...todayData.keyMetrics[2], value: 2468120, change: '-6.4%', sparkline: [40, 38, 35, 36, 32, 30, 28, 27] },
    { ...todayData.keyMetrics[3], value: 47.8, change: '+1.9pt', sparkline: [30, 32, 35, 34, 38, 40, 43, 45] },
    { ...todayData.keyMetrics[4], value: 9.4, change: '+1.0', sparkline: [25, 28, 31, 30, 34, 37, 40, 44] },
    { ...todayData.keyMetrics[5], value: 1.0, change: '-0.4', sparkline: [39, 36, 34, 31, 29, 27, 25, 23] },
  ],
}

export const dashboardDataByRange: Record<DateRange, DashboardData> = {
  today: todayData,
  '7-days': sevenDaysData,
  '30-days': thirtyDaysData,
  custom: customData,
}
