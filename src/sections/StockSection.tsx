// 交易所：炒股小玉横幅 + 小玉公司 + 股票列表
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  STOCKS,
  fmtPrice,
  companyCost,
  companyIncome,
  companyName,
  companyNextName,
  COMPANY_MAX_LV,
  type StockState,
  type Candle,
} from '@/game/stocks'
import { SHRINE_INCOME_MULT } from '@/game/shrine'
import stockBanner from '@/assets/stock-banner.jpg'

/** 简易 K 线蜡烛图：红涨绿跌，像素暗色风 */
function CandleChart({
  candles,
  w,
  h,
  show,
}: {
  candles: Candle[]
  w: number
  h: number
  show: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, w, h)
    const list = candles.slice(-show)
    if (list.length === 0) return
    let lo = Infinity
    let hi = -Infinity
    for (const c of list) {
      lo = Math.min(lo, c[2])
      hi = Math.max(hi, c[1])
    }
    if (hi <= lo) hi = lo + 1
    const pad = (hi - lo) * 0.08
    lo -= pad
    hi += pad
    const yOf = (p: number) => 2 + (1 - (p - lo) / (hi - lo)) * (h - 4)
    // 网格横线
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    for (let gy = 0; gy <= 2; gy++) {
      ctx.fillRect(0, Math.round(((h - 4) * gy) / 2) + 2, w, 1)
    }
    const cw = w / show
    const bw = Math.max(2, Math.floor(cw) - 2)
    list.forEach((c, i) => {
      const rising = c[3] >= c[0]
      const x = Math.round(i * cw + cw / 2)
      ctx.fillStyle = rising ? '#d64545' : '#3ddc84'
      const yH = yOf(c[1])
      const yL = yOf(c[2])
      const yO = yOf(c[0])
      const yC = yOf(c[3])
      ctx.fillRect(x, yH, 1, Math.max(1, yL - yH)) // 影线
      ctx.fillRect(
        Math.round(x - bw / 2),
        Math.min(yO, yC),
        bw,
        Math.max(1, Math.abs(yC - yO)),
      ) // 实体
    })
    // 最新价虚线
    const last = list[list.length - 1][3]
    ctx.fillStyle = 'rgba(255, 210, 74, 0.4)'
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, yOf(last), 2, 1)
  }, [candles, w, h, show])
  return <canvas ref={ref} width={w} height={h} className="block" />
}

function StockArt() {
  // 用户提供的原图（2560×960 → 1152×432 压缩），不做像素化
  return (
    <img
      src={stockBanner}
      alt="小玉坐在木桌前看大盘行情"
      width={384}
      height={144}
      draggable={false}
      className="mx-auto block rounded"
    />
  )
}

export default function StockSection({
  gold,
  stocks,
  onTrade,
  companyLv,
  onUpgradeCompany,
  shrineBuilt,
  realizedPnl,
  totalBought,
}: {
  gold: number
  stocks: StockState
  onTrade: (
    idx: number,
    side: 'buy' | 'sell',
    qty: number | 'all',
  ) => { ok: boolean; msg?: string }
  companyLv: number
  onUpgradeCompany: () => { ok: boolean; msg?: string }
  shrineBuilt: boolean
  /** 历史已实现盈亏（卖出结算累计，可为负） */
  realizedPnl: number
  /** 历史买入总成本（历史盈亏百分比分母） */
  totalBought: number
}) {
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<number | null>(null)

  const doTrade = (idx: number, side: 'buy' | 'sell', all = false) => {
    const raw = qtyInputs[idx] ?? ''
    if (all) {
      const r = onTrade(idx, side, 'all')
      if (!r.ok && r.msg) toast.error(r.msg)
      return
    }
    const qty = Math.floor(Number(raw))
    if (!raw || !Number.isFinite(qty) || qty <= 0) {
      toast.error(side === 'buy' ? '金币不足' : '股票不足')
      return
    }
    const r = onTrade(idx, side, qty)
    if (!r.ok && r.msg) toast.error(r.msg)
  }

  const companyMaxed = companyLv >= COMPANY_MAX_LV
  const income = companyIncome(companyLv)
  const nextName = companyNextName(companyLv)

  // ---- 总盈亏汇总：浮动盈亏合计 + 相对总成本百分比（每 tick 随价格重算） ----
  const totalBasis = stocks.costBasis.reduce((s, c) => s + c, 0)
  const totalValue = stocks.prices.reduce(
    (s, p, i) => s + p * stocks.holdings[i],
    0,
  )
  const totalPnl = totalValue - totalBasis
  const totalPct = totalBasis > 0 ? (totalPnl / totalBasis) * 100 : 0
  const hasHolding = stocks.holdings.some((h) => h > 0)
  const fmtWan = (v: number) =>
    (Math.abs(v) / 10000).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  // 历史已实现盈亏：仅显示金额（用户要求去掉百分比）；从未交易（totalBought=0）显示 --
  const hasTraded = totalBought > 0

  return (
    <div className="flex flex-col gap-4">
      {/* 横幅 */}
      <div className="pixel-panel p-2">
        <StockArt />
        <div className="py-1 text-center">
          <span className="text-gold text-sm font-bold">喵喵交易所</span>
          <span className="ml-2 text-[10px] text-slate-500">
            每 10 秒刷新 · 红涨绿跌 · 底价 1 金
          </span>
        </div>
      </div>

      {/* 小玉自己的公司 */}
      <div className="pixel-border-gold bg-[#241e14] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-base font-bold text-white">
            🏢 {companyName(companyLv)}
            <span className="text-gold ml-2 text-sm">Lv.{companyLv}</span>
            {nextName && (
              <span className="ml-2 text-[10px] text-pink-300">
                下一阶段：{nextName}
              </span>
            )}
          </div>
          <span className="text-xs text-emerald-300">
            {companyLv > 0
              ? `每 10 秒产出 ${income.toLocaleString()} 金${
                  shrineBuilt ? `（已含金铃神社 ×${SHRINE_INCOME_MULT} 加成，实际 ${(income * SHRINE_INCOME_MULT).toLocaleString()}）` : ''
                }`
              : '升级后开始自动产出金币'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          小玉白天钓鱼、晚上看盘，公司和鱼塘一起做大做强
          {shrineBuilt ? '；神社金铃保佑，公司收益同样翻倍' : '；金铃神社建成后公司收益也吃 ×2 加成'}。
        </p>
        {companyMaxed ? (
          <div className="pixel-panel mt-3 p-2 text-center text-sm font-bold text-pink-300">
            👑 商业帝国满级 · 小玉已经是传说富豪喵
          </div>
        ) : (
          <button
            className="pixel-btn pixel-btn-gold mt-3 w-full px-3 py-2 text-sm font-bold"
            disabled={gold < companyCost(companyLv)}
            onClick={() => {
              const r = onUpgradeCompany()
              if (!r.ok && r.msg) toast.error(r.msg)
            }}
          >
            升级 · {companyCost(companyLv).toLocaleString()} 金币
            {companyLv === 0 && '（开店！）'}
          </button>
        )}
      </div>

      {/* 总盈亏汇总 */}
      <div className="pixel-panel flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <span className="text-xs text-slate-400">
          📊 全部持仓
          {stocks.crisisTicks > 0 && (
            <span className="ml-2 animate-pulse rounded border border-red-500 bg-red-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-400">
              💥 金融危机中 · 剩余 {stocks.crisisTicks * 10}s
            </span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {hasHolding ? (
            <span
              className={`font-mono text-sm font-bold ${
                totalPnl >= 0 ? 'text-gold' : 'text-red-400'
              }`}
              title={`总成本 ${Math.round(totalBasis).toLocaleString()} 金 · 现值 ${Math.round(totalValue).toLocaleString()} 金`}
            >
              总盈亏 {totalPnl >= 0 ? '+' : '-'}
              {fmtWan(totalPnl)} 万元（{totalPnl >= 0 ? '+' : '-'}
              {Math.abs(totalPct).toFixed(1)}%）
            </span>
          ) : (
            <span className="font-mono text-sm text-slate-500">总盈亏 --</span>
          )}
          {hasTraded ? (
            <span
              className={`font-mono text-sm font-bold ${
                realizedPnl >= 0 ? 'text-gold' : 'text-red-400'
              }`}
              title={`历史买入总成本 ${Math.round(totalBought).toLocaleString()} 金`}
            >
              历史总盈亏 {realizedPnl >= 0 ? '+' : '-'}
              {fmtWan(realizedPnl)} 万元
            </span>
          ) : (
            <span className="font-mono text-sm text-slate-500">
              历史总盈亏 --
            </span>
          )}
        </div>
      </div>

      {/* 股票列表 */}
      <div className="flex flex-col gap-2">
        {STOCKS.map((def, i) => {
          const price = stocks.prices[i]
          const prev = stocks.prevPrices[i]
          const holding = stocks.holdings[i]
          const up = price > prev
          const down = price < prev
          const regime = stocks.regimes[i]
          return (
            <div key={def.name} className="pixel-panel p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <button
                  className="w-28 cursor-pointer text-left text-sm font-bold text-white hover:text-amber-200"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  title="点击展开 K 线图"
                >
                  {expanded === i ? '▼' : '▶'} {def.name}
                  {regime === 1 && (
                    <span className="ml-1 text-[10px] text-red-400">🔥</span>
                  )}
                  {regime === 2 && (
                    <span className="ml-1 text-[10px] text-emerald-400">🧊</span>
                  )}
                </button>
                <span
                  className={`w-24 font-mono text-sm font-bold ${
                    up
                      ? 'text-red-400'
                      : down
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                  }`}
                >
                  {up ? '▲' : down ? '▼' : '·'} {fmtPrice(price)}
                </span>
                <span className="w-20 text-xs text-slate-400">
                  持有 <span className="text-gold font-bold">{holding}</span> 股
                </span>
                {holding > 0 &&
                  (() => {
                    const basis = stocks.costBasis[i]
                    const pnl = price * holding - basis
                    const avg = basis / holding
                    const pct = avg > 0 ? ((price - avg) / avg) * 100 : 0
                    const profit = pnl >= 0
                    const sign = profit ? '+' : '-'
                    return (
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          profit ? 'text-emerald-400' : 'text-red-400'
                        }`}
                        title={`平均成本 ${fmtPrice(avg)} 金/股`}
                      >
                        {sign}
                        {Math.round(Math.abs(pnl)).toLocaleString()} 金 ({sign}
                        {Math.abs(pct).toFixed(1)}%)
                      </span>
                    )
                  })()}
                <CandleChart candles={stocks.candles[i]} w={150} h={34} show={36} />
                <input
                  type="number"
                  min={0}
                  placeholder="数量"
                  value={qtyInputs[i] ?? ''}
                  onChange={(e) =>
                    setQtyInputs((q) => ({ ...q, [i]: e.target.value }))
                  }
                  className="pixel-panel w-20 px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-600"
                />
                <div className="flex gap-1.5">
                  <button
                    className="pixel-btn px-2.5 py-1 text-xs font-bold text-red-300"
                    onClick={() => doTrade(i, 'buy')}
                  >
                    买入
                  </button>
                  <button
                    className="pixel-btn px-2.5 py-1 text-xs font-bold text-emerald-300"
                    onClick={() => doTrade(i, 'sell')}
                  >
                    卖出
                  </button>
                  <button
                    className="pixel-btn px-2.5 py-1 text-xs font-bold"
                    onClick={() => doTrade(i, 'buy', true)}
                  >
                    全部买入
                  </button>
                  <button
                    className="pixel-btn px-2.5 py-1 text-xs font-bold"
                    onClick={() => doTrade(i, 'sell', true)}
                  >
                    全部卖出
                  </button>
                </div>
              </div>
              {expanded === i && (
                <div className="pixel-panel mt-2 overflow-x-auto p-2">
                  <CandleChart
                    candles={stocks.candles[i]}
                    w={640}
                    h={90}
                    show={60}
                  />
                  {(() => {
                    const list = stocks.candles[i].slice(-60)
                    if (list.length === 0) return null
                    let hi = -Infinity
                    let lo = Infinity
                    for (const c of list) {
                      hi = Math.max(hi, c[1])
                      lo = Math.min(lo, c[2])
                    }
                    const last = list[list.length - 1][3]
                    return (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                        <span>
                          最高 <span className="text-red-300">{fmtPrice(hi)}</span>
                        </span>
                        <span>
                          最低{' '}
                          <span className="text-emerald-300">{fmtPrice(lo)}</span>
                        </span>
                        <span>
                          最新 <span className="text-gold">{fmtPrice(last)}</span>
                        </span>
                        <span className="text-slate-600">
                          近 {list.length} 根 · 3 tick/根
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
