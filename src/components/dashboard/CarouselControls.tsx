import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const TOTAL_PAGES = 5
const intervalOptions = [10, 15, 30]

type TransitionEffect = 'fade' | 'slide'

export function CarouselControls() {
  const [currentPage, setCurrentPage] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isPointerInside, setIsPointerInside] = useState(false)
  const [intervalSeconds, setIntervalSeconds] = useState(15)
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>('fade')
  const isRotating = isPlaying && !isPointerInside

  useEffect(() => {
    if (!isRotating) return

    const intervalId = window.setInterval(() => {
      setCurrentPage((page) => page === TOTAL_PAGES ? 1 : page + 1)
    }, intervalSeconds * 1000)

    return () => window.clearInterval(intervalId)
  }, [intervalSeconds, isRotating])

  function showPreviousPage() {
    setCurrentPage((page) => page === 1 ? TOTAL_PAGES : page - 1)
  }

  function showNextPage() {
    setCurrentPage((page) => page === TOTAL_PAGES ? 1 : page + 1)
  }

  function stopCarousel() {
    setIsPlaying(false)
    setCurrentPage(1)
  }

  const statusLabel = !isPlaying
    ? '已暂停'
    : isPointerInside
      ? '悬停暂停'
      : '自动播放中'

  return (
    <footer
      className="carousel-controls"
      role="region"
      aria-roledescription="carousel"
      aria-label="大屏页面轮播"
      data-playing={isRotating}
      data-effect={transitionEffect}
      onMouseEnter={() => setIsPointerInside(true)}
      onMouseLeave={() => setIsPointerInside(false)}
      onFocusCapture={(event) => {
        const previousTarget = event.relatedTarget
        if (!(previousTarget instanceof Node) || !event.currentTarget.contains(previousTarget)) {
          setIsPlaying(false)
        }
      }}
    >
      <div className="carousel-state">
        <div>
          <strong>轮播控制</strong>
          <span>第 {currentPage} 页 · {intervalSeconds} 秒切换</span>
        </div>
        <div className={`carousel-state__status${isRotating ? ' carousel-state__status--playing' : ''}`}>
          {isRotating ? <RotateCcw size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
          <span>{statusLabel}</span>
        </div>
      </div>

      <div className="carousel-pagination">
        <button
          className="carousel-pagination__toggle"
          type="button"
          aria-label={isPlaying ? '暂停自动轮播' : '开始自动轮播'}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={29} aria-hidden="true" /> : <Play size={29} aria-hidden="true" />}
        </button>
        <button
          className="carousel-pagination__arrow carousel-pagination__arrow--previous"
          type="button"
          aria-label="显示上一页"
          onClick={showPreviousPage}
        >
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <span
          className={`carousel-pagination__page carousel-pagination__page--${transitionEffect}`}
          key={`${currentPage}-${transitionEffect}`}
          aria-live={isRotating ? 'off' : 'polite'}
          aria-atomic="true"
        >
          <strong>{currentPage}</strong> / {TOTAL_PAGES}
        </span>
        <button
          className="carousel-pagination__arrow carousel-pagination__arrow--next"
          type="button"
          aria-label="显示下一页"
          onClick={showNextPage}
        >
          <ChevronRight size={26} aria-hidden="true" />
        </button>
      </div>

      <div className="carousel-settings">
        <label className="carousel-setting">
          <span>播放间隔</span>
          <div className="carousel-select">
            <select
              value={intervalSeconds}
              onChange={(event) => setIntervalSeconds(Number(event.target.value))}
            >
              {intervalOptions.map((seconds) => (
                <option value={seconds} key={seconds}>{seconds} 秒</option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </label>

        <label className="carousel-setting">
          <span>切换效果</span>
          <div className="carousel-select">
            <select
              value={transitionEffect}
              onChange={(event) => setTransitionEffect(event.target.value as TransitionEffect)}
            >
              <option value="fade">淡入淡出</option>
              <option value="slide">横向滑动</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </label>

        <button className="carousel-stop" type="button" onClick={stopCarousel}>
          <CircleStop size={17} aria-hidden="true" />
          停止轮播
        </button>
      </div>
    </footer>
  )
}
