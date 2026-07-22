type PanelHeaderProps = {
  id: string
  index: string
  title: string
  meta: string
}

export function PanelHeader({ id, index, title, meta }: PanelHeaderProps) {
  return (
    <header className="panel-heading">
      <div className="panel-heading__title">
        <span className="panel-heading__index" aria-hidden="true">{index}</span>
        <h2 id={id}>{title}</h2>
      </div>
      <span className="panel-heading__meta">{meta}</span>
    </header>
  )
}
