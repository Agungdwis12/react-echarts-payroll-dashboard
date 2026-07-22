import { Medal } from 'lucide-react'
import { formatMetricValue } from '../../utils/formatMetricValue'

type RankingItemProps = {
  rank: number
  name: string
  amount: number
  share: number
  maxAmount: number
}

export function RankingItem({
  rank,
  name,
  amount,
  share,
  maxAmount,
}: RankingItemProps) {
  const progress = `${(amount / maxAmount) * 100}%`
  const medalTone = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'

  return (
    <li className="ranking-item">
      <div className={`ranking-item__rank ranking-item__rank--${rank <= 3 ? medalTone : 'plain'}`}>
        {rank <= 3 ? <Medal size={25} strokeWidth={1.7} aria-hidden="true" /> : null}
        <span>{rank}</span>
      </div>

      <div className="ranking-item__content">
        <div className="ranking-item__summary">
          <strong>{name}</strong>
          <span>{formatMetricValue(amount, 2)} 万</span>
          <span>{share.toFixed(1)}%</span>
        </div>
        <div className="ranking-item__track" aria-hidden="true">
          <span style={{ '--progress': progress } as React.CSSProperties} />
        </div>
      </div>
    </li>
  )
}
