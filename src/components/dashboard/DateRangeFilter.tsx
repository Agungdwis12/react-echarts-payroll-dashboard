import { CalendarDays } from 'lucide-react'

export type DateRange = 'today' | '7-days' | '30-days' | 'custom'

type DateRangeFilterProps = {
  value: DateRange
  onChange: (value: DateRange) => void
}

const dateRanges: Array<{
  value: DateRange
  label: string
  icon?: typeof CalendarDays
}> = [
  { value: 'today', label: '今日' },
  { value: '7-days', label: '近 7 天' },
  { value: '30-days', label: '近 30 天' },
  { value: 'custom', label: '自定义', icon: CalendarDays },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const activeLabel = dateRanges.find((range) => range.value === value)?.label

  return (
    <fieldset className="date-range-filter">
      <legend className="visually-hidden">选择销售数据日期范围</legend>
      {dateRanges.map(({ value: rangeValue, label, icon: Icon }) => (
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
          {Icon && <Icon size={14} aria-hidden="true" />}
          <span>{label}</span>
        </label>
      ))}
      <span className="visually-hidden" aria-live="polite">
        当前日期范围：{activeLabel}
      </span>
    </fieldset>
  )
}
