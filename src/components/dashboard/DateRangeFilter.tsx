import { CalendarDays } from 'lucide-react'
import type { DateRange } from '../../types/dashboard'

export type { DateRange } from '../../types/dashboard'

type DateRangeFilterProps = {
  value: DateRange
  onChange: (value: DateRange) => void
}

const dateRanges: Array<{
  value: DateRange
  label: string
}> = [
  { value: 'today', label: '今日' },
  { value: '7-days', label: '近 7 天' },
  { value: '30-days', label: '近 30 天' },
  { value: 'custom', label: '自定义' },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const activeLabel = dateRanges.find((range) => range.value === value)?.label

  return (
    <fieldset className="date-range-filter">
      <legend className="visually-hidden">选择销售数据日期范围</legend>
      {dateRanges.map(({ value: rangeValue, label }) => (
        <label
          className={`date-range-filter__option${value === rangeValue ? ' date-range-filter__option--active' : ''}`}
          key={rangeValue}
        >
          <input
            className="visually-hidden"
            type="radio"
            name="sales-date-range"
            value={rangeValue}
            checked={value === rangeValue}
            onChange={() => onChange(rangeValue)}
          />
          <span>{label}</span>
        </label>
      ))}
      <button
        className="date-range-filter__calendar"
        type="button"
        aria-label="打开自定义日期选择"
        onClick={() => onChange('custom')}
      >
        <CalendarDays size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <span className="visually-hidden" aria-live="polite">
        当前日期范围：{activeLabel}
      </span>
    </fieldset>
  )
}
