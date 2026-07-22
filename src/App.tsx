import './App.css'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './constants/dashboard'
import { useDashboardScale } from './hooks/useDashboardScale'

function App() {
  const viewport = useDashboardScale()
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
          <DashboardLayout viewport={viewport} />
        </section>
      </div>
    </main>
  )
}

export default App
