// 像素场景画布：rAF 驱动渲染（背存 960×360 = 逻辑 480×180 × SCENE_SCALE）
import { useEffect, useRef } from 'react'
import {
  SCENE_W,
  SCENE_H,
  SCENE_SCALE,
  renderScene,
  createFx,
  type SceneSnap,
} from '@/game/scene'

export default function SceneCanvas({
  snapRef,
  onReel,
}: {
  snapRef: { current: SceneSnap }
  onReel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef(createFx())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    let raf = 0
    const loop = (ts: number) => {
      renderScene(ctx, ts / 1000, snapRef.current, fxRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [snapRef])

  return (
    <canvas
      ref={canvasRef}
      width={SCENE_W * SCENE_SCALE}
      height={SCENE_H * SCENE_SCALE}
      onClick={onReel}
      className="pixelated block w-full cursor-pointer"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
