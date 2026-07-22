import { ChevronLeft, ChevronRight, Pause, PlayCircle } from 'lucide-react'

export function CarouselControls() {
  return (
    <footer className="carousel-controls">
      <div className="carousel-state">
        <div>
          <strong>轮播控制</strong>
          <span>交互将在第 6 篇实现</span>
        </div>
        <div className="carousel-state__button">
          <PlayCircle size={18} />
          <span>自动播放中</span>
        </div>
      </div>

      <div className="carousel-pagination">
        <span className="carousel-pagination__arrow"><ChevronLeft size={26} /></span>
        <span className="carousel-pagination__page"><strong>1</strong> / 5</span>
        <span className="carousel-pagination__pause"><Pause size={30} /></span>
        <span className="carousel-pagination__arrow"><ChevronRight size={26} /></span>
      </div>

      <div className="carousel-next">
        <div>
          <strong>下一阶段：指标卡组件</strong>
          <span>第 4 篇 · 从占位框到真实数据卡</span>
        </div>
        <span className="carousel-next__marker" />
      </div>
    </footer>
  )
}
