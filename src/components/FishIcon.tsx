// 程序化像素鱼图标组件
import { useEffect, useRef } from 'react'
import { drawFishIcon, type FishSpecies } from '@/game/fish'

export default function FishIcon({
  species,
  size = 48,
  silhouette = false,
}: {
  species: FishSpecies
  size?: number
  silhouette?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  // 网格 sprite 使用自身宽高比（方形角色不被拉进 24x16 横版画布）
  const cw = species.grid ? Math.max(...species.grid.map((r) => r.length)) : 24
  const ch2 = species.grid ? species.grid.length : 16

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (silhouette) {
      // 手绘 sprite 的剪影：整调色板压暗
      const silPalette = species.palette
        ? Object.fromEntries(Object.keys(species.palette).map((k) => [k, '#3a3a52']))
        : undefined
      drawFishIcon(
        ctx,
        { ...species, body: '#3a3a52', belly: '#2c2c40', fin: '#23233a', palette: silPalette },
        cw,
        ch2,
      )
    } else {
      drawFishIcon(ctx, species, cw, ch2)
    }
  }, [species, silhouette, cw, ch2])

  return (
    <canvas
      ref={ref}
      width={cw}
      height={ch2}
      className="pixelated"
      style={{ width: size, height: (size * ch2) / cw }}
    />
  )
}
