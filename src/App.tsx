import { useEffect, useState } from 'react'
import './App.css'

const DESIGN_WIDTH = 1600
const DESIGN_HEIGHT = 1000

type ViewportState = {
  width: number
  height: number
  scale: number
}

function getViewportState(): ViewportState {
  const width = window.innerWidth
  const height = window.innerHeight

  return {
    width,
    height,
    scale: Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT),
  }
}

function App() {
  const [viewport, setViewport] = useState(getViewportState)

  useEffect(() => {
    const updateViewport = () => setViewport(getViewportState())

    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const scaledWidth = DESIGN_WIDTH * viewport.scale
  const scaledHeight = DESIGN_HEIGHT * viewport.scale

  return (
    <main className="screen-stage">
      <div
        className="canvas-frame"
        data-testid="canvas-frame"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <section
          className="dashboard-canvas"
          data-testid="dashboard-canvas"
          style={{ transform: `scale(${viewport.scale})` }}
          aria-label="1600 乘 1000 数据大屏画布"
        >
          <div className="canvas-glow canvas-glow--top" aria-hidden="true" />
          <div className="canvas-glow canvas-glow--bottom" aria-hidden="true" />

          <header className="canvas-header">
            <div className="brand-mark">
              <span className="brand-mark__dot" />
              <span>REACT DASHBOARD</span>
            </div>
            <div className="chapter-progress">
              <span>从设计稿到可运行产品</span>
              <strong>01 / 08</strong>
            </div>
          </header>

          <div className="canvas-guide">
            <span className="corner corner--top-left" />
            <span className="corner corner--top-right" />
            <span className="corner corner--bottom-left" />
            <span className="corner corner--bottom-right" />

            <div className="canvas-guide__content">
              <p className="canvas-eyebrow">CANVAS READY</p>
              <h1>第一块大屏画布已经就位</h1>
              <p className="canvas-description">
                1600 × 1000 设计基准 · 随浏览器窗口等比例缩放
              </p>

              <div className="canvas-status" aria-label="画布状态">
                <span>
                  <i className="status-dot" />画布比例 16 : 10
                </span>
                <span>
                  当前窗口 {viewport.width} × {viewport.height}
                </span>
                <span>缩放比例 {Math.round(viewport.scale * 100)}%</span>
              </div>
            </div>
          </div>

          <footer className="canvas-footer">
            <span>本章只解决一件事：让设计稿拥有稳定的浏览器画布</span>
            <span>下一篇：基础布局与组件拆分</span>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default App
