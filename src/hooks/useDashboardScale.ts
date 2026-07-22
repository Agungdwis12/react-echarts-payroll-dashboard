import { useEffect, useState } from 'react'
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  type ViewportState,
} from '../constants/dashboard'

function getViewportState(): ViewportState {
  const width = window.innerWidth
  const height = window.innerHeight

  return {
    width,
    height,
    scale: Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT),
  }
}

export function useDashboardScale() {
  const [viewport, setViewport] = useState(getViewportState)

  useEffect(() => {
    const updateViewport = () => setViewport(getViewportState())

    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  return viewport
}
