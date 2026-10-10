// 放置钓鱼游戏主逻辑：状态机、经济、升级、图鉴、存档、离线收益
import { useCallback, useEffect, useRef, useState } from 'react'
import { FISH_SPECIES, RARITY_INFO, type CatchResult, type Rarity } from '@/game/fish'
import { sfx, setMuted as audioSetMuted, startSong, stopSong } from '@/game/audio'
import { SCENE_THEMES, type SceneSnap } from '@/game/scene'
import { SPOT_MAP } from '@/game/spots'
import {
  SHRINE_STAGES,
  SHRINE_MAX_STAGE,
  SHRINE_INCOME_MULT,
} from '@/game/shrine'
import {
  STOCKS,
  TICK_MS,
  initStockState,
  engineTick,
  companyCost,
  companyIncome,
  COMPANY_MAX_LV,
  type StockState,
  type Candle,
} from '@/game/stocks'

export type Phase = 'idle' | 'casting' | 'waiting' | 'bite' | 'result'

export interface Upgrades {
  rod: number
  bait: number
  bell: number
  luckyCat: number
}

export interface CodexEntry {
  count: number
  maxWeight: number
}

export interface LogEntry {
  id: number
  fishId: string
  weight: number
  gold: number
  perfect: boolean
  time: string
}

interface SaveData {
  gold: number
  totalCatches: number
  totalGoldEarned: number
  playSeconds: number
  autoFishing: boolean
  muted: boolean
  upgrades: Upgrades
  codex: Record<string, CodexEntry>
  expectedGoldPerMin: number
  savedAt: number
  unlockedSpots?: string[]
  currentSpot?: string
  shrineStage?: number
  /** 神社建成时的累计金币（生涯成就展示用） */
  shrineCompletedGold?: number
  /** 交易所 */
  stockPrices?: number[]
  stockRegimes?: number[]
  stockTick?: number
  stockHoldings?: number[]
  stockReversion?: boolean[]
  stockCandles?: Candle[][]
  stockCosts?: number[]
  /** 交易所历史已实现盈亏（卖出结算累计，可为负） */
  stockRealizedPnl?: number
  /** 历史买入总成本（历史盈亏百分比分母） */
  stockTotalBought?: number
  companyLv?: number
  version?: number
}

const SAVE_KEY = 'neko-fishing-save-v1'

export const UPGRADE_DEFS = {
  rod: {
    name: '鱼竿',
    icon: '🎣',
    desc: '渔获价值 +12%/级，稀有度小幅提升',
    baseCost: 100,
    maxLv: 20,
    effect: (lv: number) => `价值 ×${(1 + 0.12 * lv).toFixed(2)}`,
  },
  bait: {
    name: '鱼饵',
    icon: '🪱',
    desc: '等待时间 −10%/级（最短 1.5 秒）',
    baseCost: 80,
    maxLv: 20,
    effect: (lv: number) => `等待 ×${Math.max(0.15, 1 - 0.1 * lv).toFixed(2)}`,
  },
  bell: {
    name: '幸运铃铛',
    icon: '🔔',
    desc: '稀有/史诗/传说出现率提升',
    baseCost: 150,
    maxLv: 15,
    effect: (lv: number) => `好运 +${lv * 2}%`,
  },
  luckyCat: {
    name: '金猫招财',
    icon: '🐱',
    desc: '售价 +15%/级',
    baseCost: 200,
    maxLv: 20,
    effect: (lv: number) => `售价 ×${(1 + 0.15 * lv).toFixed(2)}`,
  },
} as const

export type UpgradeKey = keyof typeof UPGRADE_DEFS

export function upgradeCost(key: UpgradeKey, lv: number) {
  return Math.round(UPGRADE_DEFS[key].baseCost * Math.pow(1.8, lv))
}

function nowSec() {
  return performance.now() / 1000
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as SaveData
    if (typeof d.gold !== 'number') return null
    return d
  } catch {
    return null
  }
}

export function useFishingGame() {
  const loaded = useRef(loadSave()).current

  const [gold, setGold] = useState(loaded?.gold ?? 0)
  const [totalCatches, setTotalCatches] = useState(loaded?.totalCatches ?? 0)
  const [totalGoldEarned, setTotalGoldEarned] = useState(
    loaded?.totalGoldEarned ?? 0,
  )
  const [playSeconds, setPlaySeconds] = useState(loaded?.playSeconds ?? 0)
  const [autoFishing, setAutoFishing] = useState(loaded?.autoFishing ?? true)
  const [muted, setMutedState] = useState(loaded?.muted ?? false)
  const [upgrades, setUpgrades] = useState<Upgrades>(
    loaded?.upgrades ?? { rod: 0, bait: 0, bell: 0, luckyCat: 0 },
  )
  const [codex, setCodex] = useState<Record<string, CodexEntry>>(
    loaded?.codex ?? {},
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [lastCatch, setLastCatch] = useState<CatchResult | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [offlineGain, setOfflineGain] = useState<number | null>(null)

  // ---- 钓场（存档迁移：旧档默认只解锁村口池塘） ----
  const initUnlocked = (() => {
    const raw = (loaded?.unlockedSpots ?? []).filter((id) => SPOT_MAP.has(id))
    if (!raw.includes('pond')) raw.unshift('pond')
    return raw.length > 0 ? raw : ['pond']
  })()
  const initSpot =
    loaded?.currentSpot && initUnlocked.includes(loaded.currentSpot)
      ? loaded.currentSpot
      : initUnlocked[0]
  const [unlockedSpots, setUnlockedSpots] = useState<string[]>(initUnlocked)
  const [currentSpot, setCurrentSpot] = useState<string>(initSpot)

  // ---- 结缘金铃神社（存档迁移：旧档默认 0 未动工） ----
  const initShrine = Math.max(
    0,
    Math.min(SHRINE_MAX_STAGE, Math.floor(loaded?.shrineStage ?? 0)),
  )
  const [shrineStage, setShrineStage] = useState<number>(initShrine)
  const [shrineCompletedGold, setShrineCompletedGold] = useState<
    number | null
  >(loaded?.shrineCompletedGold ?? null)
  const [shrineThanks, setShrineThanks] = useState(false)

  // ---- 交易所（存档迁移：旧档全部为默认值） ----
  const initStocks = initStockState(loaded ?? undefined)
  const initCompanyLv = Math.max(
    0,
    Math.min(COMPANY_MAX_LV, Math.floor(loaded?.companyLv ?? 0)),
  )
  // 价格引擎状态放 ref（随机游走不能放 setState updater，StrictMode 会双调用）
  const stockRef = useRef<StockState>(initStocks)
  const [stockUi, setStockUi] = useState<StockState>(initStocks)
  const [companyLv, setCompanyLv] = useState<number>(initCompanyLv)
  const [insiderTip, setInsiderTip] = useState<number | null>(null)
  const lastTipAt = useRef(0)
  const [crisisAlert, setCrisisAlert] = useState(false)
  // 历史已实现盈亏 / 历史买入总成本（旧档缺字段从 0 起累计）
  const initRealized =
    typeof loaded?.stockRealizedPnl === 'number' ? loaded.stockRealizedPnl : 0
  const initBought =
    typeof loaded?.stockTotalBought === 'number' && loaded.stockTotalBought > 0
      ? loaded.stockTotalBought
      : 0
  const realizedRef = useRef(initRealized)
  const boughtRef = useRef(initBought)
  const [realizedPnl, setRealizedPnl] = useState(initRealized)
  const [totalBought, setTotalBought] = useState(initBought)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const phaseEndAt = useRef(0)
  const phaseStartAt = useRef(nowSec())
  const autoRef = useRef(autoFishing)
  autoRef.current = autoFishing
  const upgradesRef = useRef(upgrades)
  upgradesRef.current = upgrades
  const goldRef = useRef(gold)
  goldRef.current = gold
  const totalGoldEarnedRef = useRef(totalGoldEarned)
  totalGoldEarnedRef.current = totalGoldEarned
  const currentSpotRef = useRef(currentSpot)
  currentSpotRef.current = currentSpot
  const unlockedRef = useRef(unlockedSpots)
  unlockedRef.current = unlockedSpots
  const shrineRef = useRef(shrineStage)
  shrineRef.current = shrineStage
  const companyRef = useRef(companyLv)
  companyRef.current = companyLv
  const logId = useRef(0)

  // 场景快照（供 canvas rAF 读取，phaseStart 用 performance 时钟）
  const sceneSnap = useRef<SceneSnap>({
    phase: 'idle' as Phase,
    phaseStart: nowSec(),
    catchFishId: null as string | null,
    catchPerfect: false,
    theme: SCENE_THEMES[initSpot] ?? SCENE_THEMES.pond,
    shrineStage: initShrine,
    singing: initShrine >= SHRINE_MAX_STAGE && (loaded?.autoFishing ?? true),
  })

  const setPhaseBoth = useCallback((p: Phase, durSec = 0) => {
    setPhase(p)
    phaseRef.current = p
    phaseStartAt.current = nowSec()
    phaseEndAt.current = durSec > 0 ? nowSec() + durSec : 0
    sceneSnap.current = {
      ...sceneSnap.current,
      phase: p,
      phaseStart: nowSec(),
    }
  }, [])

  // ---- 经济计算 ----
  const rarityWeights = useCallback((): Record<Rarity, number> => {
    const { rod, bell } = upgradesRef.current
    return {
      common: RARITY_INFO.common.weight,
      rare: RARITY_INFO.rare.weight + bell * 2 + rod * 0.5,
      epic: RARITY_INFO.epic.weight + bell * 1.5 + rod * 0.3,
      legendary: RARITY_INFO.legendary.weight + bell * 0.8 + rod * 0.15,
    }
  }, [])

  const waitTimeMs = useCallback(() => {
    const lv = upgradesRef.current.bait
    const factor = Math.max(0.15, 1 - 0.1 * lv)
    return Math.max(1500, (3000 + Math.random() * 5000) * factor)
  }, [])

  const expectedGoldPerMin = useCallback(() => {
    const w = rarityWeights()
    const spotPool = FISH_SPECIES.filter(
      (f) => f.spot === currentSpotRef.current,
    )
    const total = w.common + w.rare + w.epic + w.legendary
    let ev = 0
    for (const rarity of Object.keys(w) as Rarity[]) {
      const pool = spotPool.filter((f) => f.rarity === rarity)
      if (pool.length === 0) continue
      const avgBase = pool.reduce((s, f) => s + f.basePrice, 0) / pool.length
      ev += (w[rarity] / total) * avgBase
    }
    const rodMult = 1 + 0.12 * upgradesRef.current.rod
    const sellMult = 1 + 0.15 * upgradesRef.current.luckyCat
    const shrineMult =
      shrineRef.current >= SHRINE_MAX_STAGE ? SHRINE_INCOME_MULT : 1
    const cycleSec = 1 + 4.5 * Math.max(0.15, 1 - 0.1 * upgradesRef.current.bait) + 1.5 + 2.8
    return (ev * rodMult * sellMult * shrineMult * 60) / cycleSec
  }, [rarityWeights])

  // ---- 结算一条鱼 ----
  const resolveCatch = useCallback(
    (perfect: boolean) => {
      const w = rarityWeights()
      const spotPool = FISH_SPECIES.filter(
        (f) => f.spot === currentSpotRef.current,
      )
      // 只 roll 当前钓场池里真实存在的稀有度（例如村口池塘没有史诗）
      const entries = (Object.keys(w) as Rarity[])
        .filter((r) => spotPool.some((f) => f.rarity === r))
        .map((r) => [
          r,
          perfect && r !== 'common' ? w[r] * 1.5 : w[r],
        ]) as Array<[Rarity, number]>
      const total = entries.reduce((s, [, v]) => s + v, 0)
      let roll = Math.random() * total
      let rarity: Rarity = entries[0]?.[0] ?? 'common'
      for (const [r, v] of entries) {
        roll -= v
        if (roll <= 0) {
          rarity = r
          break
        }
      }
      const pool = spotPool.filter((f) => f.rarity === rarity)
      const species = pool[Math.floor(Math.random() * pool.length)]
      const wt =
        species.minWeight +
        Math.random() * (species.maxWeight - species.minWeight)
      const weight = Math.max(0.1, Math.round(wt * 10) / 10)
      const range = species.maxWeight - species.minWeight
      const weightFactor = range > 0 ? 0.6 + 0.8 * ((wt - species.minWeight) / range) : 1
      const rodMult = 1 + 0.12 * upgradesRef.current.rod
      const sellMult = 1 + 0.15 * upgradesRef.current.luckyCat
      const shrineMult =
        shrineRef.current >= SHRINE_MAX_STAGE ? SHRINE_INCOME_MULT : 1
      const goldEarned = Math.max(
        1,
        Math.round(
          species.basePrice * weightFactor * rodMult * sellMult * shrineMult * (perfect ? 1.5 : 1),
        ),
      )

      const result: CatchResult = { species, weight, gold: goldEarned, perfect }
      setLastCatch(result)
      setGold((g) => g + goldEarned)
      setTotalCatches((c) => c + 1)
      setTotalGoldEarned((g) => g + goldEarned)
      setCodex((c) => {
        const prev = c[species.id] ?? { count: 0, maxWeight: 0 }
        return {
          ...c,
          [species.id]: {
            count: prev.count + 1,
            maxWeight: Math.max(prev.maxWeight, weight),
          },
        }
      })
      setLog((l) =>
        [
          {
            id: ++logId.current,
            fishId: species.id,
            weight,
            gold: goldEarned,
            perfect,
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          },
          ...l,
        ].slice(0, 30),
      )
      sceneSnap.current = {
        ...sceneSnap.current,
        catchFishId: species.id,
        catchPerfect: perfect,
      }
      if (perfect) sfx.perfect()
      else sfx.catch()
      setPhaseBoth('result', 2.8)
    },
    [rarityWeights, setPhaseBoth],
  )

  // ---- 收杆（玩家点击） ----
  const reel = useCallback(() => {
    if (phaseRef.current === 'bite') {
      resolveCatch(true)
    }
  }, [resolveCatch])

  // ---- 主循环 tick ----
  useEffect(() => {
    const timer = setInterval(() => {
      const t = nowSec()
      const p = phaseRef.current
      if (p === 'idle') {
        if (autoRef.current) {
          sfx.cast()
          sceneSnap.current = { ...sceneSnap.current, catchFishId: null }
          setPhaseBoth('casting', 1)
        }
        return
      }
      if (phaseEndAt.current === 0 || t < phaseEndAt.current) return
      switch (p) {
        case 'casting': {
          const wait = waitTimeMs()
          setPhaseBoth('waiting', wait / 1000)
          break
        }
        case 'waiting':
          sfx.bite()
          setPhaseBoth('bite', 2)
          break
        case 'bite':
          resolveCatch(false) // 窗口过期，自动收杆
          break
        case 'result':
          if (autoRef.current) {
            sfx.cast()
            sceneSnap.current = { ...sceneSnap.current, catchFishId: null }
            setPhaseBoth('casting', 1)
          } else {
            setPhaseBoth('idle')
          }
          break
      }
    }, 100)
    return () => clearInterval(timer)
  }, [setPhaseBoth, waitTimeMs, resolveCatch])

  // ---- 游戏时长累计 ----
  useEffect(() => {
    const timer = setInterval(() => setPlaySeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // ---- 离线收益（仅首次加载计算一次） ----
  useEffect(() => {
    if (!loaded || !loaded.savedAt) return
    const elapsed = (Date.now() - loaded.savedAt) / 1000
    if (elapsed < 120) return
    const capped = Math.min(elapsed, 8 * 3600)
    const gain = Math.floor(((loaded.expectedGoldPerMin || 5) * capped) / 60 * 0.6)
    if (gain > 0) {
      setGold((g) => g + gain)
      setTotalGoldEarned((g) => g + gain)
      setOfflineGain(gain)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 存档 ----
  const saveNow = useCallback(() => {
    const data: SaveData = {
      gold,
      totalCatches,
      totalGoldEarned,
      playSeconds,
      autoFishing,
      muted,
      upgrades,
      codex,
      expectedGoldPerMin: expectedGoldPerMin(),
      savedAt: Date.now(),
      unlockedSpots,
      currentSpot,
      shrineStage,
      shrineCompletedGold: shrineCompletedGold ?? undefined,
      stockPrices: stockRef.current.prices,
      stockRegimes: stockRef.current.regimes,
      stockTick: stockRef.current.tick,
      stockHoldings: stockRef.current.holdings,
      stockReversion: stockRef.current.reversion,
      stockCandles: stockRef.current.candles,
      stockCosts: stockRef.current.costBasis,
      stockRealizedPnl: realizedRef.current,
      stockTotalBought: boughtRef.current,
      companyLv,
      version: 4,
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [gold, totalCatches, totalGoldEarned, playSeconds, autoFishing, muted, upgrades, codex, expectedGoldPerMin, unlockedSpots, currentSpot, shrineStage, shrineCompletedGold, companyLv])

  const saveRef = useRef(saveNow)
  saveRef.current = saveNow
  useEffect(() => {
    const timer = setInterval(() => saveRef.current(), 5000)
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveRef.current()
    }
    const onUnload = () => saveRef.current()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  // ---- 操作 ----
  const toggleAuto = useCallback(() => {
    setAutoFishing((a) => !a)
    sfx.click()
  }, [])

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      audioSetMuted(!m)
      return !m
    })
  }, [])

  useEffect(() => {
    audioSetMuted(muted)
  }, [muted])

  // 注意：副作用（音效/嵌套 setState）不能放进 setGold 的 updater，
  // StrictMode 下 updater 会被双调用。统一在 updater 外用 ref 判断。
  const buyUpgrade = useCallback((key: UpgradeKey) => {
    const lv = upgradesRef.current[key]
    const def = UPGRADE_DEFS[key]
    if (lv >= def.maxLv) return
    const cost = upgradeCost(key, lv)
    if (goldRef.current < cost) {
      sfx.denied()
      return
    }
    sfx.purchase()
    setGold((g) => g - cost)
    setUpgrades((u) => ({ ...u, [key]: u[key] + 1 }))
  }, [])

  // ---- 钓场：切换 / 解锁 ----
  const applySpot = useCallback(
    (id: string) => {
      setCurrentSpot(id)
      currentSpotRef.current = id
      sceneSnap.current = {
        ...sceneSnap.current,
        theme: SCENE_THEMES[id] ?? SCENE_THEMES.pond,
        catchFishId: null,
      }
      setPhaseBoth('idle')
    },
    [setPhaseBoth],
  )

  const switchSpot = useCallback(
    (id: string) => {
      if (!unlockedRef.current.includes(id)) return
      if (currentSpotRef.current === id) return
      sfx.click()
      applySpot(id)
    },
    [applySpot],
  )

  const unlockSpot = useCallback(
    (id: string) => {
      const def = SPOT_MAP.get(id)
      if (!def || unlockedRef.current.includes(id)) return
      if (goldRef.current < def.cost) {
        sfx.denied()
        return
      }
      sfx.purchase()
      setGold((g) => g - def.cost)
      setUnlockedSpots((u) => [...u, id])
      unlockedRef.current = [...unlockedRef.current, id]
      applySpot(id) // 解锁后自动切换过去
    },
    [applySpot],
  )

  // ---- 结缘金铃神社：按阶段建造（StrictMode 安全：ref 判断在 updater 外） ----
  const buildShrineStage = useCallback(() => {
    const stage = shrineRef.current
    if (stage >= SHRINE_MAX_STAGE) return
    const cost = SHRINE_STAGES[stage].cost
    if (goldRef.current < cost) {
      sfx.denied()
      return
    }
    const next = stage + 1
    setGold((g) => g - cost)
    setShrineStage(next)
    shrineRef.current = next
    if (next >= SHRINE_MAX_STAGE) {
      // 落成！庆典：号角 + 粒子爆发 + 致谢信 + 称号
      sfx.fanfare()
      setShrineCompletedGold(totalGoldEarnedRef.current)
      sceneSnap.current = {
        ...sceneSnap.current,
        shrineStage: next,
        celebrateAt: nowSec(),
        singing: autoRef.current,
      }
      setShrineThanks(true)
    } else {
      sfx.purchase()
      sceneSnap.current = { ...sceneSnap.current, shrineStage: next }
    }
  }, [])

  // ---- 小玉唱歌：神社建成且自动钓鱼中时（暂停即停唱） ----
  useEffect(() => {
    const singing = shrineStage >= SHRINE_MAX_STAGE && autoFishing
    sceneSnap.current = { ...sceneSnap.current, singing }
    if (singing) startSong()
    else stopSong()
  }, [shrineStage, autoFishing])

  // ---- 交易所 tick：每 10 秒价格变动 + 公司产出（切 tab 不停） ----
  useEffect(() => {
    const timer = setInterval(() => {
      // 价格引擎
      const { next, upEntrants, crisisStarted } = engineTick(stockRef.current)
      stockRef.current = next
      setStockUi(next)
      // 金融危机：触发即弹红色警报（可关闭），危机在引擎内持续 6 tick
      if (crisisStarted) {
        sfx.denied()
        setCrisisAlert(true)
      }
      // 内幕消息：某只股票进入上涨周期时小概率弹窗（冷却 5 分钟，不打断操作）
      if (
        upEntrants.length > 0 &&
        Date.now() - lastTipAt.current > 5 * 60_000 &&
        Math.random() < 0.35
      ) {
        lastTipAt.current = Date.now()
        setInsiderTip(upEntrants[Math.floor(Math.random() * upEntrants.length)])
      }
      // 小玉公司产出（吃神社 ×2 加成）
      const lv = companyRef.current
      if (lv > 0) {
        const mult = shrineRef.current >= SHRINE_MAX_STAGE ? SHRINE_INCOME_MULT : 1
        const income = companyIncome(lv) * mult
        setGold((g) => g + income)
        setTotalGoldEarned((g) => g + income)
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [])

  // ---- 股票交易（StrictMode 安全：先算后 set，ref 为准） ----
  const trade = useCallback(
    (
      idx: number,
      side: 'buy' | 'sell',
      qty: number | 'all',
    ): { ok: boolean; msg?: string } => {
      const s = stockRef.current
      const def = STOCKS[idx]
      if (!def) return { ok: false }
      const price = s.prices[idx]
      if (side === 'buy') {
        const n = qty === 'all' ? Math.floor(goldRef.current / price) : qty
        const cost = Math.ceil(price * n)
        if (n <= 0 || cost > goldRef.current) {
          sfx.denied()
          return { ok: false, msg: '金币不足' }
        }
        sfx.purchase()
        setGold((g) => g - cost)
        const holdings = [...s.holdings]
        holdings[idx] += n
        // 买入：成本按实付金额加权累计；历史买入总成本累计
        const costBasis = [...s.costBasis]
        costBasis[idx] += cost
        boughtRef.current += cost
        setTotalBought(boughtRef.current)
        stockRef.current = { ...s, holdings, costBasis }
        setStockUi(stockRef.current)
        return { ok: true }
      }
      const have = s.holdings[idx]
      const n = qty === 'all' ? have : qty
      if (n <= 0 || n > have) {
        sfx.denied()
        return { ok: false, msg: '股票不足' }
      }
      sfx.purchase()
      const gain = Math.floor(price * n)
      setGold((g) => g + gain)
      const holdings = [...s.holdings]
      holdings[idx] -= n
      // 卖出：按股数比例摊薄成本；清仓归零
      const costBasis = [...s.costBasis]
      const costShare = (s.costBasis[idx] * n) / have
      costBasis[idx] = holdings[idx] <= 0 ? 0 : s.costBasis[idx] - costShare
      // 结算已实现盈亏：卖出所得 − 卖出股数对应的成本份额
      realizedRef.current += gain - costShare
      setRealizedPnl(realizedRef.current)
      stockRef.current = { ...s, holdings, costBasis }
      setStockUi(stockRef.current)
      return { ok: true }
    },
    [],
  )

  // ---- 小玉公司升级 ----
  const upgradeCompany = useCallback((): { ok: boolean; msg?: string } => {
    const lv = companyRef.current
    if (lv >= COMPANY_MAX_LV) return { ok: false }
    const cost = companyCost(lv)
    if (goldRef.current < cost) {
      sfx.denied()
      return { ok: false, msg: '金币不足' }
    }
    sfx.purchase()
    setGold((g) => g - cost)
    setCompanyLv(lv + 1)
    companyRef.current = lv + 1
    return { ok: true }
  }, [])

  const statusText =
    phase === 'idle'
      ? autoFishing
        ? '准备甩竿…'
        : '已暂停 · 点击「自动钓鱼」继续'
      : phase === 'casting'
        ? '甩竿！'
        : phase === 'waiting'
          ? '等待鱼儿上钩…'
          : phase === 'bite'
            ? '咬钩了！快收杆！'
            : lastCatch
              ? `钓到了 ${lastCatch.species.name}！+${lastCatch.gold} 金币`
              : '结算中…'

  return {
    gold,
    totalCatches,
    totalGoldEarned,
    playSeconds,
    autoFishing,
    muted,
    upgrades,
    codex,
    phase,
    lastCatch,
    log,
    offlineGain,
    setOfflineGain,
    statusText,
    sceneSnap,
    reel,
    toggleAuto,
    toggleMute,
    buyUpgrade,
    unlockedSpots,
    currentSpot,
    unlockSpot,
    switchSpot,
    shrineStage,
    buildShrineStage,
    shrineThanks,
    setShrineThanks,
    shrineCompletedGold,
    stockUi,
    trade,
    insiderTip,
    setInsiderTip,
    companyLv,
    upgradeCompany,
    stockRealizedPnl: realizedPnl,
    stockTotalBought: totalBought,
    crisisAlert,
    setCrisisAlert,
  }
}
