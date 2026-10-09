// 喵喵交易所：股票定义 + 价格引擎（纯函数）+ 小玉公司数值
// 节奏：每 10 秒一个 tick，18 tick（3 分钟）一个小周期重新掷走势

export interface StockDef {
  name: string
  base: number // 基准价（均值回归锚点）
  tip: string // 内幕消息文案（进入上涨周期前可能弹出）
}

export const STOCKS: StockDef[] = [
  { name: '猫条科技', base: 50, tip: '三文鱼原料产地突发限购，猫条产能告急' },
  { name: '深海摸鱼集团', base: 120, tip: '灯笼鱼照明订单暴增，深海加班灯供不应求' },
  { name: '猪猪很芒', base: 30, tip: '氦气短缺预警，小超同款猪猪气球排产紧张' },
  { name: '英喵达', base: 400, tip: '显存颗粒减产，钓鱼佬们正在连夜囤货' },
  { name: '存一条鱼', base: 80, tip: '冷库仓位爆满，存鱼排队排到了下个季度' },
  { name: '大肥鱼乳业', base: 150, tip: '大肥鱼产奶季延迟，鱼奶奶源全线紧缺' },
  { name: '锦鲤物流', base: 65, tip: '龙门航道拥堵，跃龙门加急费宣布上调' },
  { name: '竹竿跳动', base: 220, tip: '竹林笋源减产，短视频竹竿道具全面涨价' },
  { name: '爱稀饭', base: 500, tip: '陨星坠落带临时管制，星砂开采指标收缩' },
  { name: '喵喵山泉', base: 25, tip: '水源地生态保护限采，瓶装水配额缩减' },
]

export const CYCLE_TICKS = 18 // 一个小周期 = 18 tick = 3 分钟
export const TICK_MS = 10_000

/** K 线蜡烛 [开, 高, 低, 收]：3 个 tick 聚合一根 */
export type Candle = [number, number, number, number]
export const CANDLE_TICKS = 3
/** 每股最多保留 150 根（≈25 个小周期，远超展示的 3~5 个） */
export const MAX_CANDLES = 150

export interface StockState {
  prices: number[]
  prevPrices: number[]
  /** 0=震荡 1=上涨 2=下跌（本周期走势） */
  regimes: number[]
  /** 当前周期内第几个 tick（0..17） */
  tick: number
  holdings: number[]
  /** 每股持仓总成本（金）：买入加权累计、卖出按比例摊薄、清仓归零 */
  costBasis: number[]
  /** 均值回归触发中（偏离基准 ±300% 后逐步拉回） */
  reversion: boolean[]
  /** 每股历史蜡烛（旧 → 新） */
  candles: Candle[][]
  /** 每股正在成型的蜡烛（未满 3 tick） */
  forming: (Candle | null)[]
  formingTicks: number[]
}

/** 读档迁移：字段缺失/长度不对一律安全兜底 */
export function initStockState(saved?: {
  stockPrices?: number[]
  stockRegimes?: number[]
  stockTick?: number
  stockHoldings?: number[]
  stockReversion?: boolean[]
  stockCandles?: Candle[][]
  stockCosts?: number[]
}): StockState {
  const prices = STOCKS.map((s, i) => {
    const p = saved?.stockPrices?.[i]
    return typeof p === 'number' && p > 0 ? p : s.base
  })
  const regimes = STOCKS.map((_, i) => {
    const r = saved?.stockRegimes?.[i]
    return r === 1 || r === 2 ? r : 0
  })
  const holdings = STOCKS.map((_, i) => {
    const h = saved?.stockHoldings?.[i]
    return typeof h === 'number' && h > 0 ? Math.floor(h) : 0
  })
  const tick =
    typeof saved?.stockTick === 'number'
      ? Math.min(CYCLE_TICKS - 1, Math.max(0, Math.floor(saved.stockTick)))
      : 0
  const reversion = STOCKS.map((_, i) => saved?.stockReversion?.[i] === true)
  const candles = STOCKS.map((s, i) => {
    const list = saved?.stockCandles?.[i]
    if (!Array.isArray(list)) {
      // 旧档无历史：用基准价造一根平蜡烛，图表不至于空白
      return [[s.base, s.base, s.base, s.base] as Candle]
    }
    return list
      .filter(
        (c): c is Candle =>
          Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number'),
      )
      .slice(-MAX_CANDLES)
  })
  // 成本迁移：旧档无字段时以现价计成本（盈亏从 0 起算）；持仓 0 则成本 0
  const costBasis = STOCKS.map((_, i) => {
    if (holdings[i] <= 0) return 0
    const c = saved?.stockCosts?.[i]
    return typeof c === 'number' && c > 0 ? c : prices[i] * holdings[i]
  })
  return {
    prices,
    prevPrices: [...prices],
    regimes,
    tick,
    holdings,
    costBasis,
    reversion,
    candles,
    forming: STOCKS.map(() => null),
    formingTicks: STOCKS.map(() => 0),
  }
}

export interface TickResult {
  next: StockState
  /** 本 tick 进入上涨周期的股票下标（供内幕消息抽奖） */
  upEntrants: number[]
}

/** 推进一个 tick（纯函数，可安全复算） */
export function engineTick(s: StockState): TickResult {
  const upEntrants: number[] = []
  let regimes = s.regimes
  let tick = s.tick + 1
  if (tick >= CYCLE_TICKS) {
    // 新周期：每只独立掷骰 15% 涨 / 15% 跌 / 70% 震荡
    tick = 0
    regimes = s.regimes.map(() => {
      const r = Math.random()
      return r < 0.15 ? 1 : r < 0.3 ? 2 : 0
    })
  }
  const prices = s.prices.map((p0, i) => {
    const base = STOCKS[i].base
    let p = p0
    const regime = regimes[i]
    if (regime === 1) {
      p *= 1.04 // 18 tick 累计 ≈ +102%
      if (s.tick === CYCLE_TICKS - 1 || s.regimes[i] !== 1) {
        // 刚进入上涨周期
        if (!upEntrants.includes(i)) upEntrants.push(i)
      }
    } else if (regime === 2) {
      p *= 0.955 // 18 tick 累计 ≈ -56%
    } else {
      p *= 1 + (Math.random() - 0.5) * 0.24 // 震荡：单 tick ±12%，周期振幅约 ±50%
    }
    // 均值回归：偏离基准 ±300% 触发，之后每 tick 拉向基准 8%
    let rev = s.reversion[i]
    if (!rev && (p > base * 4 || p < base * 0.25)) rev = true
    if (rev) {
      p += (base - p) * 0.08
      if (p > base * 0.5 && p < base * 2.5) rev = false
    }
    s.reversion[i] = rev
    return Math.max(1, Math.round(p * 100) / 100) // 底价 1 金币
  })
  // ---- K 线聚合：3 个 tick 收盘价合成一根 OHLC 蜡烛 ----
  const forming: (Candle | null)[] = []
  const formingTicks: number[] = []
  const candles = s.candles.map((list, i) => {
    const prev = s.prices[i]
    const p = prices[i]
    const f = s.forming[i]
    const next: Candle = f
      ? [f[0], Math.max(f[1], p), Math.min(f[2], p), p]
      : [prev, Math.max(prev, p), Math.min(prev, p), p]
    const n = s.formingTicks[i] + 1
    if (n >= CANDLE_TICKS) {
      forming.push(null)
      formingTicks.push(0)
      return [...list, next].slice(-MAX_CANDLES)
    }
    forming.push(next)
    formingTicks.push(n)
    return list
  })
  return {
    next: {
      prices,
      prevPrices: s.prices,
      regimes,
      tick,
      holdings: s.holdings,
      costBasis: s.costBasis,
      reversion: s.reversion,
      candles,
      forming,
      formingTicks,
    },
    upEntrants,
  }
}

/** 价格展示格式化：大额取整，小额两位小数 */
export function fmtPrice(p: number): string {
  return p >= 1000 ? Math.round(p).toLocaleString() : p.toFixed(2)
}

// ---------- 小玉自己的公司 ----------
export const COMPANY_MAX_LV = 20

/** 升级费用：base 500 × 1.55^lv（升到满级总投入 ≈ 390 万金，配上后期收益对得起"商业帝国"） */
export function companyCost(lv: number): number {
  return Math.round(500 * Math.pow(1.55, lv))
}

/** 每 10 秒自动产出（金币），随等级超线性增长；神社 ×2 加成在结算层乘 */
export function companyIncome(lv: number): number {
  return lv <= 0 ? 0 : Math.round(8 * Math.pow(lv, 1.6))
}

export function companyName(lv: number): string {
  if (lv <= 0) return '未开张'
  if (lv < 5) return '小玉的小店'
  if (lv < 10) return '小玉公司'
  if (lv < 15) return '小玉大公司'
  return '小玉商业帝国'
}

/** 下一阶段名称预览（满级返回 null） */
export function companyNextName(lv: number): string | null {
  if (lv >= COMPANY_MAX_LV) return null
  const cur = companyName(lv)
  const nxt = companyName(lv + 1)
  return nxt === cur ? null : nxt
}
