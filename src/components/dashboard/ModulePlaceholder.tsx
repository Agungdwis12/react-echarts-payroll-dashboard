import { AreaChart } from 'lucide-react'

type ModulePlaceholderProps = {
  title: string
  chapter: string
}

export function ModulePlaceholder({ title, chapter }: ModulePlaceholderProps) {
  return (
    <div className="module-placeholder">
      <span className="module-placeholder__tag">COMPONENT BOUNDARY</span>
      <div className="module-placeholder__content">
        <AreaChart size={30} strokeWidth={1.5} />
        <strong>{title}</strong>
        <span>{chapter}</span>
      </div>
    </div>
  )
}
