import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

type PanelHeaderProps = {
  id: string
  title: string
  meta?: ReactNode
  showInfo?: boolean
}

export function PanelHeader({
  id,
  title,
  meta,
  showInfo = false,
}: PanelHeaderProps) {
  return (
    <header className="panel-heading">
      <div className="panel-heading__title">
        <h2 id={id}>{title}</h2>
        {showInfo && <Info size={17} strokeWidth={1.8} aria-hidden="true" />}
      </div>
      {meta && <div className="panel-heading__meta">{meta}</div>}
    </header>
  )
}
