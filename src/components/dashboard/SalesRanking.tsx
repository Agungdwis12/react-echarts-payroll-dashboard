import { PanelHeader } from './PanelHeader'
import { RankingItem } from './RankingItem'

const rankingData = [
  { name: '智能制造博览会', amount: 1236.52, share: 14.1 },
  { name: '医疗健康展', amount: 1021.34, share: 11.7 },
  { name: '消费电子展', amount: 986.71, share: 11.3 },
  { name: '新能源汽车展', amount: 862.15, share: 9.8 },
  { name: '全球供应链展', amount: 754.49, share: 8.6 },
]

const maxAmount = Math.max(...rankingData.map((item) => item.amount))

export function SalesRanking() {
  return (
    <aside className="panel sales-ranking" aria-labelledby="sales-ranking-title">
      <PanelHeader
        id="sales-ranking-title"
        index="02"
        title="销售额 TOP5 展会"
        meta="实时排行"
      />

      <div className="ranking-table">
        <div className="ranking-table__head" aria-hidden="true">
          <span>展会名称</span>
          <span>销售额</span>
          <span>占比</span>
        </div>
        <ol className="ranking-list" aria-label="销售额排名前五的展会">
          {rankingData.map((item, index) => (
            <RankingItem
              key={item.name}
              rank={index + 1}
              maxAmount={maxAmount}
              {...item}
            />
          ))}
        </ol>
      </div>
    </aside>
  )
}
