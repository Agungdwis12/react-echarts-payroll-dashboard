import type { RankingData } from '../../types/dashboard'
import { PanelHeader } from './PanelHeader'
import { RankingItem } from './RankingItem'

type SalesRankingProps = {
  ranking: RankingData[] | null
}

export function SalesRanking({ ranking }: SalesRankingProps) {
  const maxAmount = ranking ? Math.max(...ranking.map((item) => item.amount)) : 0

  return (
    <aside className="panel sales-ranking" aria-labelledby="sales-ranking-title">
      <PanelHeader
        id="sales-ranking-title"
        index="02"
        title="销售额 TOP5 展会"
        meta={ranking ? '随日期范围同步更新' : '正在等待数据'}
      />

      <div className="ranking-table">
        <div className="ranking-table__head" aria-hidden="true">
          <span>展会名称</span>
          <span>销售额</span>
          <span>占比</span>
        </div>
        <ol className="ranking-list" aria-label="销售额排名前五的展会">
          {ranking
            ? ranking.map((item, index) => (
                <RankingItem
                  key={item.name}
                  rank={index + 1}
                  maxAmount={maxAmount}
                  {...item}
                />
              ))
            : Array.from({ length: 5 }, (_, index) => (
                <li className="ranking-item skeleton-ranking" key={index} aria-hidden="true" />
              ))}
        </ol>
      </div>
    </aside>
  )
}
