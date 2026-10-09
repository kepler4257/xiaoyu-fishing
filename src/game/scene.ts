// 像素场景渲染（HD 2x 背存）：逻辑坐标 480×180，画布背存 960×360
// 小玉为 96×96 高分辨率 sprite（drawSprite scale 1 = 2 设备像素/格）；
// 猪猪气球 / 鱼图标 / 神社 sprite 保持粗像素（scale 2 = 4 设备像素/格）
// 场景元素（波浪/钓线/星星/云/光晕/粒子）用 0.5 逻辑单位（= 1 设备像素）细化
import {
  NEKO_IDLE,
  NEKO_EXCITED,
  NEKO_PALETTE,
  PIG_BALLOON,
  PIG_PALETTE,
  SHRINE_LAYERS,
  SHRINE_PALETTE,
  drawSprite,
} from './sprite'
import { FISH_MAP, drawFishIcon } from './fish'

export const SCENE_W = 480
export const SCENE_H = 180
/** 背存放大倍数：画布 960×360，逻辑坐标系不变 */
export const SCENE_SCALE = 2
const HORIZON = 100
const DAY_CYCLE = 240 // 一昼夜 240 秒

export type ScenePhase = 'idle' | 'casting' | 'waiting' | 'bite' | 'result'

export interface SceneSnap {
  phase: ScenePhase
  /** performance.now()/1000 时钟 */
  phaseStart: number
  catchFishId: string | null
  catchPerfect: boolean
  /** 当前钓场主题（缺省村口池塘） */
  theme?: SceneTheme
  /** 神社建造阶段 0-5 */
  shrineStage?: number
  /** 小玉是否在唱歌（神社建成 + 自动钓鱼中） */
  singing?: boolean
  /** 樱花庆典触发时刻（performance 时钟秒），场景据此放一次粒子爆发 */
  celebrateAt?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  /** 边长（逻辑单位，0.5 = 1 设备像素） */
  size: number
}

interface JumpFish {
  x: number
  t0: number
  dir: number
}

export interface SceneFx {
  particles: Particle[]
  jumpFish: JumpFish | null
  nextJumpAt: number
  lastPhase: ScenePhase
  /** 已消费过的庆典时刻，防止重复爆发 */
  lastCelebrateAt: number
}

export function createFx(): SceneFx {
  return {
    particles: [],
    jumpFish: null,
    nextJumpAt: 6,
    lastPhase: 'idle',
    lastCelebrateAt: 0,
  }
}

// ---------- 工具 ----------
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(
    lerp(ca[1], cb[1], t),
  )},${Math.round(lerp(ca[2], cb[2], t))})`
}

/** 实心圆（平滑抗锯齿） */
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** 径向渐变光晕（替代同心透明方块，过渡更顺滑） */
function radialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  alpha: number,
) {
  if (alpha <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb}, ${Math.min(1, alpha)})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

// 天空关键帧：[时刻, 天顶, 天中, 地平线, 海面, 夜晚度]
type SkyKeys = Array<[number, string, string, string, string, number]>

export interface SceneTheme {
  mode: 'cycle' | 'fixed' // cycle=昼夜循环 / fixed=固定天色
  skyKeys?: SkyKeys
  fixed?: { top: string; mid: string; horizon: string; sea: string; night: number }
  decor: 'pond' | 'bamboo' | 'abyss' | 'starlake'
  waves?: [string, string, string]
  clouds: boolean
}

const POND_SKY: SkyKeys = [
  [0.0, '#3a2e5c', '#b0657a', '#f2a65e', '#3d4d6b', 0.35], // 黎明
  [0.22, '#4a90d9', '#7ec0ee', '#cfeef7', '#3f7ab8', 0.0], // 正午
  [0.5, '#3b2e5c', '#c65d7a', '#f28c4a', '#4a3a6b', 0.25], // 黄昏
  [0.68, '#0c0c24', '#1c1c3c', '#2c2c4c', '#14203c', 1.0], // 夜晚
  [1.0, '#3a2e5c', '#b0657a', '#f2a65e', '#3d4d6b', 0.35], // 回到黎明
]

// 竹林溪涧：整体绿色调
const BAMBOO_SKY: SkyKeys = [
  [0.0, '#3a4a3c', '#7a9a6b', '#d8e8a8', '#3d6b52', 0.3],
  [0.22, '#5aa87e', '#8fd0a8', '#e8f5d8', '#4a8a68', 0.0],
  [0.5, '#3b4a38', '#a88a5c', '#e8c87a', '#3d5c48', 0.25],
  [0.68, '#0a1810', '#142418', '#203024', '#0e2018', 1.0],
  [1.0, '#3a4a3c', '#7a9a6b', '#d8e8a8', '#3d6b52', 0.3],
]

export const SCENE_THEMES: Record<string, SceneTheme> = {
  pond: { mode: 'cycle', skyKeys: POND_SKY, decor: 'pond', clouds: true },
  bamboo: {
    mode: 'cycle',
    skyKeys: BAMBOO_SKY,
    decor: 'bamboo',
    clouds: true,
    waves: ['#e8f8d8', '#a8d8b0', '#7ab88a'],
  },
  abyss: {
    mode: 'fixed',
    decor: 'abyss',
    clouds: false,
    fixed: { top: '#03060e', mid: '#08101e', horizon: '#0c1626', sea: '#060b18', night: 1 },
    waves: ['#24406b', '#1a2f52', '#122240'],
  },
  starlake: {
    mode: 'fixed',
    decor: 'starlake',
    clouds: false,
    fixed: { top: '#0e0624', mid: '#221248', horizon: '#3a2462', sea: '#160e34', night: 1 },
    waves: ['#5a48a3', '#453a80', '#322860'],
  },
}

function skyAt(ct: number, keys: SkyKeys) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, ...a] = keys[i]
    const [t1, ...b] = keys[i + 1]
    if (ct >= t0 && ct <= t1) {
      const t = (ct - t0) / (t1 - t0)
      return {
        top: lerpColor(a[0], b[0], t),
        mid: lerpColor(a[1], b[1], t),
        horizon: lerpColor(a[2], b[2], t),
        sea: lerpColor(a[3], b[3], t),
        night: lerp(a[4], b[4], t),
      }
    }
  }
  const [, top, mid, horizon, sea, night] = keys[0]
  return { top, mid, horizon, sea, night }
}

// 星星固定位置（伪随机）；s = 光晕强度档
const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: ((i * 97 + 31) % SCENE_W) + 0.5,
  y: ((i * 53 + 17) % (HORIZON - 14)) + 0.5,
  big: i % 4 === 0,
  tw: (i * 7) % 10,
}))

// 星空湖畔：更密集的星野（2x 背存下更密也不糊）
const DENSE_STARS = Array.from({ length: 170 }, (_, i) => ({
  x: ((i * 71 + 13) % SCENE_W) + 0.5,
  y: ((i * 41 + 7) % (HORIZON - 10)) + 0.5,
  big: i % 6 === 0,
  warm: i % 5 === 0,
  tw: (i * 11) % 10,
}))

/** 画一颗星：1 设备像素星点 + 可选柔光晕 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  big: boolean,
  alpha: number,
  color: string,
) {
  if (alpha <= 0.01) return
  ctx.fillStyle = color
  if (big) {
    ctx.globalAlpha = alpha * 0.25
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
    ctx.globalAlpha = alpha
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
  } else {
    ctx.globalAlpha = alpha
    ctx.fillRect(x - 0.25, y - 0.25, 0.5, 0.5)
  }
}

// ---------- 主渲染 ----------
export function renderScene(
  ctx: CanvasRenderingContext2D,
  now: number, // performance.now()/1000
  snap: SceneSnap,
  fx: SceneFx,
) {
  // 逻辑坐标 480×180 → 背存 960×360
  ctx.setTransform(SCENE_SCALE, 0, 0, SCENE_SCALE, 0, 0)
  const W = SCENE_W
  const H = SCENE_H
  const ct = (now % DAY_CYCLE) / DAY_CYCLE
  const theme = snap.theme ?? SCENE_THEMES.pond
  const decor = theme.decor
  const sky =
    theme.mode === 'fixed' && theme.fixed
      ? theme.fixed
      : skyAt(ct, theme.skyKeys ?? POND_SKY)
  const night = sky.night

  // --- 天空渐变（0.5 逻辑单位 = 1 设备像素横向条带） ---
  for (let y = 0; y < HORIZON; y += 0.5) {
    const t = y / HORIZON
    const col =
      t < 0.55
        ? lerpColor(sky.top, sky.mid, t / 0.55)
        : lerpColor(sky.mid, sky.horizon, (t - 0.55) / 0.45)
    ctx.fillStyle = col
    ctx.fillRect(0, y, W, 0.55)
  }
  // 黎明/黄昏地平线暖光
  if (night < 0.7 && night > 0.05) {
    radialGlow(ctx, W * 0.5, HORIZON, 120, '242, 166, 94', (0.7 - night) * 0.35)
  }

  // --- 星空湖畔：极光带（流动的半透明渐变缎带） ---
  if (decor === 'starlake') {
    for (let band = 0; band < 2; band++) {
      const yBase = 22 + band * 16
      ctx.fillStyle = band === 0 ? '#4ae8a8' : '#8f7bd8'
      for (let x = 0; x < W; x += 1.5) {
        const y = yBase + Math.sin(x * 0.02 + now * 0.5 + band * 2) * 8
        ctx.globalAlpha = 0.08 + 0.045 * Math.sin(now * 0.8 + x * 0.05)
        ctx.fillRect(x, y, 1.5, 9 + band * 4)
      }
    }
    ctx.globalAlpha = 1
  }

  // --- 深海：顶部光柱（细腻斜向光束） ---
  if (decor === 'abyss') {
    for (let i = 0; i < 3; i++) {
      const rx = 160 + i * 90 + Math.sin(now * 0.3 + i) * 10
      ctx.fillStyle = '#7db8e8'
      for (let y = 0; y < HORIZON + 30; y += 2) {
        const off = y * 0.3
        ctx.globalAlpha = 0.045 + 0.018 * Math.sin(now * 0.7 + i * 2)
        ctx.fillRect(rx + off, y, 13 - y * 0.06, 2)
      }
    }
    ctx.globalAlpha = 1
  }

  // --- 星星 ---
  if (night > 0.15 && decor !== 'abyss') {
    for (const st of STARS) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * 2 + st.tw)
      drawStar(ctx, st.x, st.y, st.big, night * twinkle, '#ffffff')
    }
    ctx.globalAlpha = 1
  }
  // 星空湖畔：更密的星星 + 流星
  if (decor === 'starlake') {
    for (const st of DENSE_STARS) {
      const twinkle = 0.4 + 0.6 * Math.sin(now * 1.5 + st.tw)
      drawStar(
        ctx,
        st.x,
        st.y,
        st.big,
        twinkle,
        st.warm ? '#ffe9f2' : '#c8d5ff',
      )
    }
    ctx.globalAlpha = 1
    // 流星：每 13 秒一颗，持续约 0.8 秒（细腻尾迹）
    const cycleIdx = Math.floor(now / 13)
    const st = now - cycleIdx * 13
    if (st < 0.8) {
      const seed = (cycleIdx * 137) % 300
      const sx0 = 120 + seed
      const sy0 = 8 + ((cycleIdx * 53) % 30)
      const head = st / 0.8
      const hx = sx0 + head * 60
      const hy = sy0 + head * 26
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 1 - i / 10
        ctx.fillStyle = i === 0 ? '#ffffff' : '#a8c8ff'
        const s = i === 0 ? 1 : 0.75
        ctx.fillRect(hx - i * 2.2, hy - i * 1, s, s)
      }
      ctx.globalAlpha = 1
    }
  }

  // --- 月亮（夜）/ 太阳（昼）：圆盘 + 径向光晕 ---
  if (decor === 'starlake') {
    // 星空湖畔：大月亮常驻
    radialGlow(ctx, 407, 25, 34, '245, 239, 213', 0.22)
    ctx.fillStyle = '#f5efd5'
    circle(ctx, 407, 25, 16.5)
    ctx.fillStyle = '#e0d5b8'
    circle(ctx, 401, 20, 2.8)
    circle(ctx, 412, 30, 2.2)
    circle(ctx, 410, 18, 1.4)
  } else if (decor === 'pond' || decor === 'bamboo') {
    if (night > 0.2) {
      ctx.globalAlpha = Math.min(1, night)
      radialGlow(ctx, 407, 27, 24, '245, 239, 213', 0.2 * night)
      ctx.fillStyle = '#f5efd5'
      circle(ctx, 407, 27, 10.5)
      ctx.fillStyle = sky.top
      circle(ctx, 402.5, 24, 9) // 咬出月牙
      ctx.globalAlpha = 1
    } else if (night < 0.6) {
      ctx.globalAlpha = Math.max(0, 1 - night * 1.4)
      radialGlow(ctx, 246, 30, 28, '255, 233, 160', 0.3 * ctx.globalAlpha)
      ctx.fillStyle = '#ffe9a0'
      circle(ctx, 246, 30, 11)
      ctx.fillStyle = '#fff6d8'
      circle(ctx, 246, 30, 7)
      ctx.globalAlpha = 1
    }
  }

  // --- 云：重叠椭圆的柔软云团 ---
  if (theme.clouds) {
    const cloudShade = lerpColor(
      decor === 'bamboo' ? '#f4fff0' : '#ffffff',
      '#3a3a5c',
      night * 0.85,
    )
    ctx.fillStyle = cloudShade
    for (let i = 0; i < 4; i++) {
      const speed = 3 + i * 1.7
      const cx = ((i * 137 + now * speed) % (W + 90)) - 45
      const cy = 12 + i * 14 + Math.sin(now * 0.4 + i * 2) * 0.8
      ctx.globalAlpha = 0.8 - i * 0.1
      ctx.beginPath()
      ctx.ellipse(cx, cy, 17, 3.6, 0, 0, Math.PI * 2)
      ctx.ellipse(cx - 8, cy + 1.6, 9.5, 2.6, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 9, cy + 1.4, 10.5, 2.8, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 1, cy - 2.2, 8, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // --- 海面 ---
  ctx.fillStyle = sky.sea
  ctx.fillRect(0, HORIZON, W, H - HORIZON)

  // 三层视差波浪：1 设备像素高的细腻正弦水线
  const waveCols =
    theme.waves ?? [
      lerpColor('#ffffff', '#3d5a8a', 0.5 + night * 0.3),
      lerpColor('#cfeef7', '#2c4470', 0.45 + night * 0.3),
      lerpColor('#9fd0e8', '#1c3054', 0.4 + night * 0.3),
    ]
  for (let layer = 0; layer < 3; layer++) {
    const yBase = HORIZON + 12 + layer * 18
    const amp = 2 + layer
    const speed = 1.2 + layer * 0.7
    ctx.fillStyle = waveCols[layer]
    ctx.globalAlpha = 0.85 - layer * 0.18
    for (let x = 0; x < W; x += 1) {
      const y = yBase + Math.sin(x * 0.05 + now * speed + layer * 2) * amp
      ctx.fillRect(x, y, 1, 0.5)
    }
  }
  ctx.globalAlpha = 1

  // 海面闪光（夜晚月光碎银 / 白天波光；深海换成浮游生物）
  if (decor !== 'abyss') {
    ctx.fillStyle = night > 0.5 ? '#d5d5f5' : '#ffffff'
    for (let i = 0; i < 14; i++) {
      const sx = (i * 67 + 13 + Math.floor(now * 2) * 7) % W
      const sy = HORIZON + 6 + ((i * 29) % (H - HORIZON - 10))
      ctx.globalAlpha = 0.22 + 0.18 * Math.sin(now * 3 + i)
      ctx.fillRect(sx, sy, 1.5, 0.5)
      if (i % 4 === 0) ctx.fillRect(sx + 0.5, sy - 0.5, 0.5, 1.5) // 十字星芒
    }
    ctx.globalAlpha = 1
  }

  // --- 竹林溪涧：竹干剪影 + 落叶 + 斑驳光点 ---
  if (decor === 'bamboo') {
    // 竹干（画面前后两排）
    const stalks: Array<[number, number, string]> = [
      [10, 7, '#24401f'], [30, 5, '#2d4a26'], [452, 6, '#24401f'], [468, 5, '#2d4a26'],
    ]
    for (const [bx, bw, col] of stalks) {
      ctx.fillStyle = col
      ctx.fillRect(bx, 0, bw, H)
      // 左侧细腻受光边
      ctx.fillStyle = 'rgba(255, 255, 220, 0.08)'
      ctx.fillRect(bx + 0.5, 0, 0.5, H)
      ctx.fillStyle = '#1a3016'
      for (let y = 14; y < H; y += 22) ctx.fillRect(bx, y, bw, 1) // 竹节
    }
    // 飘落竹叶（细小叶片 + 叶尖）
    ctx.fillStyle = '#7ab86b'
    for (let i = 0; i < 7; i++) {
      const lx = (i * 83 + now * 9) % (W + 20) - 10
      const ly = (i * 47 + now * 14) % (H + 16) - 8
      const sway = Math.sin(now * 2 + i * 1.7) * 3
      ctx.globalAlpha = 0.85
      ctx.fillRect(Math.round((lx + sway) * 2) / 2, Math.round(ly * 2) / 2, 1.5, 1)
      ctx.fillRect(Math.round((lx + sway) * 2) / 2 + 0.5, Math.round(ly * 2) / 2 - 0.5, 0.5, 0.5)
    }
    ctx.globalAlpha = 1
    // 白天斑驳光影（柔和椭圆光斑）
    if (night < 0.5) {
      ctx.fillStyle = '#f0ffd0'
      for (let i = 0; i < 6; i++) {
        const dx = 150 + i * 55 + Math.sin(now * 0.6 + i) * 6
        const dy = HORIZON + 14 + (i % 3) * 18
        ctx.globalAlpha = (1 - night) * 0.12
        ctx.beginPath()
        ctx.ellipse(dx + 7, dy + 2.5, 8, 2.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }

  // --- 深海：浮游生物 + 上升气泡 ---
  if (decor === 'abyss') {
    const planktonCols = ['#7df2ff', '#8affc8', '#ff7de8', '#b8e8ff']
    for (let i = 0; i < 26; i++) {
      const px = (i * 89 + 21 + Math.sin(now * 0.4 + i) * 14 + now * 2) % W
      const py =
        HORIZON +
        4 +
        ((i * 37 + Math.round(Math.sin(now * 0.5 + i * 2) * 6)) %
          (H - HORIZON - 8))
      const core = i % 3 === 0 ? 1 : 0.5
      const a = 0.4 + 0.4 * Math.sin(now * 2.2 + i * 1.3)
      ctx.fillStyle = planktonCols[i % 4]
      ctx.globalAlpha = a * 0.25
      ctx.fillRect(px - 1, py - 1, core + 2, core + 2) // 柔光晕
      ctx.globalAlpha = a
      ctx.fillRect(px, py, core, core) // 1 设备像素核心
    }
    ctx.globalAlpha = 1
    // 气泡：细描边圆 + 高光点
    for (let i = 0; i < 4; i++) {
      const bx = 190 + i * 70
      const range = H - HORIZON - 6
      const by = H - 4 - ((now * (10 + i * 3) + i * 31) % range)
      const wobble = Math.sin(now * 3 + i) * 2
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#9fd0e8'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(bx + wobble, by, 1.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#cfeef7'
      ctx.fillRect(bx + wobble - 0.5, by - 0.7, 0.5, 0.5)
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.arc(bx + wobble + 4, ((by + range * 0.5) % range) + HORIZON, 0.7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // --- 星空湖畔：湖面月光倒影（细波纹） ---
  if (decor === 'starlake') {
    ctx.fillStyle = '#f5efd5'
    for (let y = HORIZON + 6; y < H; y += 2.5) {
      const wob = Math.sin(y * 0.4 + now * 1.8) * 4
      const ww = Math.max(4, 30 - (y - HORIZON) / 3)
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(now * 2 + y)
      ctx.fillRect(407 - ww / 2 + wob, y, ww, 1)
    }
    ctx.globalAlpha = 1
  }

  // --- 结缘金铃神社（右侧水面石台上，随阶段生长；sprite 保持粗像素） ---
  const shrineStage = snap.shrineStage ?? 0
  if (shrineStage > 0) {
    const shX = 400
    const shY = 40
    // 水面柔影（细波）
    for (let y = HORIZON + 8; y < H - 6; y += 2) {
      const wob = Math.sin(y * 0.5 + now * 1.5) * 3
      const ww = Math.max(3, 26 - (y - HORIZON) / 4)
      ctx.globalAlpha = 0.07
      ctx.fillStyle = night > 0.5 ? '#ffdca8' : '#9a9aac'
      ctx.fillRect(shX + 22 - ww / 2 + wob, y, ww, 1)
    }
    ctx.globalAlpha = 1
    for (let li = 0; li < Math.min(shrineStage, SHRINE_LAYERS.length); li++) {
      drawSprite(ctx, SHRINE_LAYERS[li], SHRINE_PALETTE, shX, shY, 2)
    }
    if (shrineStage >= 5) {
      // 双吊灯 + 金铃暖光晕（径向渐变，夜晚 / 永夜钓场）
      if (night > 0.3) {
        const flick = 0.8 + 0.2 * Math.sin(now * 7)
        radialGlow(ctx, 421, 76, 20, '255, 196, 106', 0.4 * night * flick)
        radialGlow(ctx, 445, 76, 20, '255, 196, 106', 0.4 * night * flick)
        radialGlow(ctx, 413, 74, 10, '255, 210, 74', 0.18 * night * flick)
        radialGlow(ctx, 449, 74, 10, '255, 210, 74', 0.18 * night * flick)
      }
      // 金铃高光闪烁（细星芒）
      for (let i = 0; i < 2; i++) {
        const bx = i === 0 ? 413 : 449
        const glint = Math.max(0, Math.sin(now * 2.4 + i * 2.2) - 0.55) * 2
        if (glint > 0.05) {
          ctx.globalAlpha = glint
          ctx.fillStyle = '#fff6d8'
          ctx.fillRect(bx - 0.25, 72.75, 0.5, 2.5)
          ctx.fillRect(bx - 1.25, 73.75, 2.5, 0.5)
        }
      }
      ctx.globalAlpha = 1
      // 樱花瓣绕社飘落（细瓣）
      ctx.fillStyle = '#ffb3c8'
      for (let i = 0; i < 6; i++) {
        const px = 380 + ((i * 37 + now * 8) % 112)
        const py = 46 + ((i * 23 + now * 5) % 64)
        const sway = Math.sin(now * 2 + i * 1.3) * 4
        const rx = Math.round((px + sway) * 2) / 2
        const ry = Math.round(py * 2) / 2
        ctx.globalAlpha = 0.8
        ctx.fillRect(rx, ry, 1.5, 1)
        ctx.fillStyle = '#ffd0de'
        ctx.fillRect(rx + 0.5, ry - 0.5, 0.5, 0.5)
        ctx.fillStyle = '#ffb3c8'
      }
      ctx.globalAlpha = 1
    }
  }

  // --- 码头（左侧木栈道） ---
  const dockY = 112
  const dockEnd = 132
  // 支柱
  for (const px of [14, 58, 102, 126]) {
    ctx.fillStyle = '#5c4030'
    ctx.fillRect(px, dockY + 6, 6, H - dockY - 6)
    ctx.fillStyle = '#4a3226'
    ctx.fillRect(px + 4, dockY + 6, 2, H - dockY - 6)
    ctx.fillStyle = 'rgba(255, 230, 190, 0.12)'
    ctx.fillRect(px + 0.5, dockY + 6, 0.5, H - dockY - 6) // 细受光边
  }
  // 甲板木板
  ctx.fillStyle = '#8a6547'
  ctx.fillRect(0, dockY, dockEnd, 7)
  ctx.fillStyle = '#6e4f36'
  for (let x = 0; x < dockEnd; x += 12) ctx.fillRect(x, dockY, 0.75, 7)
  ctx.fillRect(0, dockY + 5, dockEnd, 1.5)
  ctx.fillStyle = '#a87f5c'
  ctx.fillRect(0, dockY, dockEnd, 0.75)

  // --- 灯笼（夜晚暖光，径向渐变光晕） ---
  const lampX = 118
  ctx.fillStyle = '#4a3226'
  ctx.fillRect(lampX, dockY - 22, 3, 22)
  ctx.fillRect(lampX, dockY - 22, 12, 3)
  ctx.fillStyle = night > 0.3 ? '#ffd24a' : '#c9a86b'
  ctx.fillRect(lampX + 9, dockY - 20, 6, 8)
  ctx.fillStyle = '#8a6547'
  ctx.fillRect(lampX + 9, dockY - 22, 6, 2)
  ctx.fillRect(lampX + 9, dockY - 12, 6, 2)
  if (night > 0.3) {
    const flick = 0.85 + 0.15 * Math.sin(now * 6.3)
    radialGlow(ctx, lampX + 12, dockY - 16, 26, '255, 210, 74', 0.32 * night * flick)
  }

  // --- 猪猪气球（保持像素 sprite） ---
  const pigBob = Math.round(Math.sin(now * 1.4) * 3)
  const pigX = 34
  const pigY = 46 + pigBob
  // 绳子：细平滑曲线
  ctx.strokeStyle = 'rgba(217, 217, 232, 0.85)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let y = pigY + 10 * 2; y < dockY; y += 3) {
    const x = pigX + 16.5 + Math.sin(now + y * 0.2) * 1
    if (y === pigY + 20) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  drawSprite(ctx, PIG_BALLOON, PIG_PALETTE, pigX, pigY, 2)

  // --- 猫娘小玉（96x96 sprite，scale 1 逻辑 = 2 设备像素/格；显示尺寸与原 48x48 一致） ---
  const bobOffset = Math.round(Math.sin(now * 2.2) * 1) // 2 帧起伏
  const excited = snap.phase === 'result' && snap.catchFishId
  const bounce =
    excited && now - snap.phaseStart < 1.2
      ? -Math.abs(Math.round(Math.sin((now - snap.phaseStart) * 10) * 3))
      : 0
  const nekoX = 72
  const nekoY = dockY - 78 + bobOffset + bounce // 裙摆落在码头面上
  drawSprite(
    ctx,
    excited ? NEKO_EXCITED : NEKO_IDLE,
    NEKO_PALETTE,
    nekoX,
    nekoY,
    1,
  )
  // 猫尾巴（程序化摆动，保持粗像素）
  const tailSwing = Math.round(Math.sin(now * 1.8) * 3)
  ctx.fillStyle = '#f7dd8e'
  const tailBaseX = nekoX - 2
  const tailBaseY = nekoY + 76
  for (let i = 0; i < 8; i++) {
    const tx = tailBaseX - i + Math.round(Math.sin(i * 0.7 + now * 1.8) * 2)
    const ty = tailBaseY - i * 2 - Math.abs(tailSwing) + (i > 5 ? -2 : 0)
    ctx.fillRect(tx, ty, 3, 3)
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(tailBaseX - 7, tailBaseY - 16 - Math.abs(tailSwing), 3, 3)

  // --- 小玉的歌声：♪ 音符周期性飘起（细化：椭圆符头 + 细符杆） ---
  if (snap.singing) {
    for (let i = 0; i < 3; i++) {
      const t = (now * 0.45 + i / 3) % 1
      const nx =
        nekoX + 46 + i * 10 + Math.sin(now * 1.5 + i * 2.1) * 5
      const ny = nekoY + 6 - t * 28
      const col = i % 2 === 0 ? '#ffd24a' : '#ffb3c8'
      ctx.globalAlpha = Math.max(0, 1 - t)
      ctx.fillStyle = col
      // 符头
      ctx.beginPath()
      ctx.ellipse(nx, ny + 5, 1.8, 1.3, -0.3, 0, Math.PI * 2)
      ctx.fill()
      // 符杆 + 符尾
      ctx.strokeStyle = col
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(nx + 1.6, ny + 5)
      ctx.lineTo(nx + 1.6, ny)
      ctx.quadraticCurveTo(nx + 4, ny + 0.8, nx + 3.2, ny + 2.8)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // --- 钓竿（平滑弧线，1 设备像素级描边） ---
  const handX = nekoX + 30 * 2
  const handY = nekoY + 29 * 2
  const bitePull = snap.phase === 'bite' ? 6 : 0
  const rodTipX = handX + 62
  const rodTipY = handY - 34 + bitePull
  ctx.strokeStyle = '#7a4a2d'
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(handX, handY)
  ctx.quadraticCurveTo(
    (handX + rodTipX) / 2 + 3,
    (handY + rodTipY) / 2 - 4,
    rodTipX,
    rodTipY,
  )
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.25)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(handX + 1, handY - 1)
  ctx.quadraticCurveTo(
    (handX + rodTipX) / 2 + 3,
    (handY + rodTipY) / 2 - 5,
    rodTipX,
    rodTipY - 1,
  )
  ctx.stroke()

  // --- 鱼漂 / 钓线 ---
  const bobberX = 300
  const waterY = HORIZON + 16
  const bob = Math.round(Math.sin(now * 2.4) * 4) / 2 // 0.5 逻辑步进
  const duck = snap.phase === 'bite' ? 5 : 0
  const bobberY = waterY + bob + duck

  if (snap.phase === 'casting') {
    // 甩竿：鱼漂沿弧线飞出
    const t = Math.min(1, (now - snap.phaseStart) / 1)
    const cx = lerp(rodTipX, bobberX, t)
    const cy = lerp(rodTipY, waterY, t) - Math.sin(t * Math.PI) * 30
    drawFishingLine(ctx, rodTipX, rodTipY, cx, cy)
    drawBobber(ctx, cx, cy)
  } else if (
    snap.phase === 'waiting' ||
    snap.phase === 'bite' ||
    snap.phase === 'result'
  ) {
    drawFishingLine(ctx, rodTipX, rodTipY, bobberX, bobberY)
    if (!(snap.phase === 'result' && now - snap.phaseStart < 0.8)) {
      drawBobber(ctx, bobberX, bobberY)
      // 鱼漂涟漪
      ctx.globalAlpha = 0.2 + 0.08 * Math.sin(now * 3)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.ellipse(
        bobberX,
        bobberY + 2.5,
        5.5 + Math.sin(now * 3) * 1,
        1.5,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // 咬钩：水花 + 感叹号（细化 + 轻微弹跳）
  if (snap.phase === 'bite') {
    const bt = now - snap.phaseStart
    if (bt < 0.6 && Math.random() < 0.5) {
      spawnSplash(fx, bobberX, waterY + 2, 4)
    }
    const flash = Math.floor(now * 4) % 2 === 0
    if (flash) {
      const hop = Math.abs(Math.sin(now * 6)) * 1.5
      ctx.fillStyle = '#ffd24a'
      const ex = bobberX - 1.5
      const ey = waterY - 22 - hop
      ctx.fillRect(ex, ey, 3, 9)
      ctx.fillRect(ex + 0.5, ey - 1, 2, 1) // 顶部圆角感
      ctx.fillRect(ex, ey + 11.5, 3, 3)
      ctx.fillStyle = '#fff6d8'
      ctx.fillRect(ex + 0.5, ey + 0.5, 1, 8) // 高光
    }
  }

  // --- 随机跃出水面的鱼（平滑椭圆小鱼） ---
  if (
    !fx.jumpFish &&
    now > fx.nextJumpAt &&
    (snap.phase === 'waiting' || snap.phase === 'idle')
  ) {
    fx.jumpFish = {
      x: 170 + Math.random() * 240,
      t0: now,
      dir: Math.random() > 0.5 ? 1 : -1,
    }
  }
  if (fx.jumpFish) {
    const jt = (now - fx.jumpFish.t0) / 0.9
    if (jt >= 1) {
      spawnSplash(fx, fx.jumpFish.x + fx.jumpFish.dir * 14, waterY + 6, 6)
      fx.jumpFish = null
      fx.nextJumpAt = now + 5 + Math.random() * 9
    } else {
      const jx = fx.jumpFish.x + fx.jumpFish.dir * jt * 14
      const jy = waterY + 6 - Math.sin(jt * Math.PI) * 26
      if (jt < 0.15 && Math.random() < 0.4)
        spawnSplash(fx, fx.jumpFish.x, waterY + 6, 1)
      const d = fx.jumpFish.dir
      ctx.fillStyle = '#c8d2dc'
      ctx.beginPath()
      ctx.ellipse(jx + 3.5, jy + 1.5, 3.8, 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
      // 尾鳍
      ctx.beginPath()
      const tailX = jx + 3.5 - d * 3.8
      ctx.moveTo(tailX, jy + 1.5)
      ctx.lineTo(tailX - d * 2.6, jy - 0.6)
      ctx.lineTo(tailX - d * 2.6, jy + 3.6)
      ctx.closePath()
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#101018'
      ctx.fillRect(jx + 3.5 + d * 2 - 0.4, jy + 0.9, 0.8, 0.8)
    }
  }

  // --- 渔获飞弧线 ---
  if (snap.phase === 'result' && snap.catchFishId) {
    const rt = (now - snap.phaseStart) / 0.8
    if (rt < 1) {
      const fx0 = bobberX
      const fy0 = waterY
      const fx1 = nekoX + 60
      const fy1 = dockY - 20
      const cx = lerp(fx0, fx1, rt)
      const cy = lerp(fy0, fy1, rt) - Math.sin(rt * Math.PI) * 46
      const species = FISH_MAP.get(snap.catchFishId)
      if (species) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(2, 2)
        drawFishIcon(ctx, species, 16, 12)
        ctx.restore()
      }
      if (Math.random() < 0.4) spawnSplash(fx, fx0, fy0 + 2, 1)
    } else if (rt < 1.6) {
      // 星光闪烁（小圆点）
      const spark = snap.catchPerfect ? '#ffd24a' : '#ffffff'
      ctx.fillStyle = spark
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047 + now * 3
        const sx = nekoX + 60 + Math.cos(a) * 12
        const sy = dockY - 20 + Math.sin(a) * 8
        circle(ctx, sx, sy, 0.9)
      }
    }
  }

  // --- 樱花庆典：一次性花瓣 + 金币粒子爆发 ---
  if ((snap.celebrateAt ?? 0) > fx.lastCelebrateAt) {
    fx.lastCelebrateAt = snap.celebrateAt ?? 0
    for (let i = 0; i < 90; i++) {
      fx.particles.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.45,
        vx: (Math.random() - 0.5) * 44,
        vy: -12 - Math.random() * 42,
        life: 0,
        maxLife: 1.2 + Math.random() * 1.3,
        color: i % 3 === 0 ? '#ffd24a' : '#ffb3c8',
        size: i % 3 === 0 ? 1 : 1.3,
      })
    }
  }

  // --- 粒子 ---
  updateParticles(ctx, fx)

  // --- 夜晚整体暗角 ---
  if (night > 0.05) {
    ctx.globalAlpha = night * 0.16
    ctx.fillStyle = '#05051a'
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }
}

function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rx = Math.round(x * 2) / 2
  const ry = Math.round(y * 2) / 2
  ctx.fillStyle = '#d64545'
  ctx.fillRect(rx - 2, ry - 5, 4, 2.5)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(rx - 2, ry - 2.5, 4, 2.5)
  ctx.fillStyle = '#101018'
  ctx.fillRect(rx - 0.75, ry - 6.5, 1.5, 1.5)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.fillRect(rx - 1.5, ry - 4.5, 1, 1) // 高光
}

/** 钓线：1 设备像素平滑描边 + 自然下垂 */
function drawFishingLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  ctx.strokeStyle = 'rgba(232, 232, 240, 0.9)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = lerp(x0, x1, t)
    const y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * 6 // 线微微下垂
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function spawnSplash(fx: SceneFx, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    fx.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 30,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3,
      color: '#cfeef7',
      size: 0.5 + Math.random() * 0.75,
    })
  }
}

let lastFrame = 0
function updateParticles(ctx: CanvasRenderingContext2D, fx: SceneFx) {
  const now = performance.now() / 1000
  const dt = Math.min(0.1, now - lastFrame || 0.016)
  lastFrame = now
  fx.particles = fx.particles.filter((p) => {
    p.life += dt
    if (p.life >= p.maxLife) return false
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 120 * dt
    ctx.globalAlpha = 1 - p.life / p.maxLife
    ctx.fillStyle = p.color
    // 0.5 逻辑步进（1 设备像素）的细腻运动
    ctx.fillRect(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2, p.size, p.size)
    ctx.globalAlpha = 1
    return true
  })
}
