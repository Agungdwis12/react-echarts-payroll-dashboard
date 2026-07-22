import type { ReactNode } from 'react'

type PanelHeaderProps = {
  id: string
  index: string
  title: string
  meta: ReactNode
}

export function PanelHeader({ id, index, title, meta }: PanelHeaderProps) {
  return (
    <header className="panel-heading">
      <div className="panel-heading__title">
        <span className="panel-heading__index" aria-hidden="true">{index}</span>
        <h2 id={id}>{title}</h2>
      </div>
      <div className="panel-heading__meta">{meta}</div>
    </header>
  )
}
