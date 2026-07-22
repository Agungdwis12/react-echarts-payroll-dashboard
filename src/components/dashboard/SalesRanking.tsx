import { PanelHeader } from './PanelHeader'

const ranks = [82, 68, 57, 48, 39]

export function SalesRanking() {
  return (
    <aside className="panel" aria-labelledby="sales-ranking-title">
      <PanelHeader
        id="sales-ranking-title"
        index="02"
        title="销售额 TOP5 展会"
        meta="第 6 篇实现"
      />

      <div className="ranking-list">
        {ranks.map((progress, index) => (
          <div className="ranking-placeholder" key={progress}>
            <span className="ranking-placeholder__number">{index + 1}</span>
            <div className="ranking-placeholder__copy">
              <div className="ranking-placeholder__name" />
              <div className="ranking-placeholder__bar" style={{ '--progress': `${progress}%` } as React.CSSProperties} />
            </div>
            <div className="ranking-placeholder__value" />
          </div>
        ))}
      </div>
    </aside>
  )
}
