// 小玉钓鱼物语 · 主页面
import { useEffect, useState } from 'react'
import { useFishingGame } from '@/hooks/useFishingGame'
import { unlockAudio } from '@/game/audio'
import { RARITY_INFO } from '@/game/fish'
import { SPOTS, SPOT_MAP } from '@/game/spots'
import FishIcon from '@/components/FishIcon'
import SceneCanvas from '@/sections/SceneCanvas'
import ShopSection from '@/sections/ShopSection'
import CodexSection from '@/sections/CodexSection'
import CharacterSection from '@/sections/CharacterSection'
import StockSection from '@/sections/StockSection'
import CatchLog from '@/sections/CatchLog'
import { STOCKS } from '@/game/stocks'
import { Toaster } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type Tab = 'shop' | 'stocks' | 'codex' | 'character'

export default function Home() {
  const game = useFishingGame()
  const [tab, setTab] = useState<Tab>('shop')

  // 首次用户交互解锁音频
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const biting = game.phase === 'bite'
  const showCatch =
    game.phase === 'result' && !!game.lastCatch && tab !== 'stocks'

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 text-slate-200">
      {/* 标题栏 */}
      <header className="pixel-border flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-gold text-xl font-bold tracking-widest">
            小玉钓鱼物语
          </h1>
          {game.shrineStage >= 5 && (
            <span className="pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px] font-bold">
              👑 传说的钓手
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-xs text-slate-400">
            📍 {SPOT_MAP.get(game.currentSpot)?.name ?? '村口池塘'}
          </span>
          <span className="text-gold font-bold">
            ◆ {game.gold.toLocaleString()} 金币
          </span>
          <span className="text-slate-300">渔获 {game.totalCatches}</span>
          <button className="pixel-btn px-3 py-1 text-xs" onClick={game.toggleMute}>
            {game.muted ? '🔇 已静音' : '🔊 音效开'}
          </button>
          <button
            className={`pixel-btn px-3 py-1 text-xs ${game.autoFishing ? 'pixel-btn-pink' : ''}`}
            onClick={game.toggleAuto}
          >
            {game.autoFishing ? '自动钓鱼 · 开' : '自动钓鱼 · 关'}
          </button>
        </div>
      </header>

      {/* 像素场景 */}
      <div className="pixel-border mt-4">
        <SceneCanvas snapRef={game.sceneSnap} onReel={game.reel} />
      </div>

      {/* 钓场选择 */}
      <div className="pixel-border mt-3 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {SPOTS.map((spot) => {
            const unlocked = game.unlockedSpots.includes(spot.id)
            const active = game.currentSpot === spot.id
            const affordable = game.gold >= spot.cost
            return (
              <button
                key={spot.id}
                title={spot.desc}
                disabled={!unlocked && !affordable}
                onClick={() =>
                  unlocked ? game.switchSpot(spot.id) : game.unlockSpot(spot.id)
                }
                className={`pixel-btn px-3 py-1.5 text-xs font-bold ${
                  active
                    ? 'pixel-btn-gold'
                    : unlocked
                      ? 'pixel-btn-pink'
                      : affordable
                        ? ''
                        : 'cursor-not-allowed opacity-50'
                }`}
              >
                {unlocked
                  ? `${active ? '🎣 ' : ''}${spot.name}`
                  : `🔒 ${spot.name} · ${spot.cost.toLocaleString()} 金`}
              </button>
            )
          })}
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500">
          {SPOT_MAP.get(game.currentSpot)?.desc}
        </div>
      </div>

      {/* 状态行 + 收杆 */}
      <div
        className={`pixel-border mt-4 flex items-center justify-between gap-3 px-4 py-3 ${biting ? 'bite-flash' : ''}`}
      >
        <span
          className={`text-sm font-bold ${biting ? 'text-gold' : 'text-slate-300'}`}
        >
          当前状态：{game.statusText}
        </span>
        <button
          className={`pixel-btn px-6 py-2 text-base font-bold ${biting ? 'pixel-btn-gold' : ''}`}
          onClick={game.reel}
          disabled={!biting}
        >
          {biting ? '收杆！！' : '收杆'}
        </button>
      </div>

      {/* 标签页 */}
      <nav className="mt-4 flex gap-2">
        {(
          [
            ['shop', '商店'],
            ['stocks', '交易所'],
            ['codex', '图鉴'],
            ['character', '角色'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            className={`pixel-btn px-5 py-2 text-sm font-bold ${tab === key ? 'pixel-btn-gold' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="pixel-border mt-3 p-4">
        {tab === 'shop' && (
          <ShopSection
            gold={game.gold}
            upgrades={game.upgrades}
            onBuy={game.buyUpgrade}
            shrineStage={game.shrineStage}
            onBuildShrine={game.buildShrineStage}
          />
        )}
        {tab === 'stocks' && (
          <StockSection
            gold={game.gold}
            stocks={game.stockUi}
            onTrade={game.trade}
            companyLv={game.companyLv}
            onUpgradeCompany={game.upgradeCompany}
            shrineBuilt={game.shrineStage >= 5}
            realizedPnl={game.stockRealizedPnl}
            totalBought={game.stockTotalBought}
          />
        )}
        {tab === 'codex' && <CodexSection codex={game.codex} />}
        {tab === 'character' && (
          <CharacterSection
            totalCatches={game.totalCatches}
            totalGoldEarned={game.totalGoldEarned}
            playSeconds={game.playSeconds}
            codex={game.codex}
            shrineBuilt={game.shrineStage >= 5}
            shrineCompletedGold={game.shrineCompletedGold}
          />
        )}
      </main>

      {/* 最近渔获 */}
      <CatchLog log={game.log} />

      {/* 渔获结算弹窗 */}
      <Dialog open={showCatch}>
        <DialogContent className="pixel-border-gold border-0 bg-[#1e1e2e] text-slate-200 sm:max-w-xs [&>button]:hidden">
          {game.lastCatch && (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-center font-mono"
                  style={{
                    color: RARITY_INFO[game.lastCatch.species.rarity].color,
                  }}
                >
                  {game.lastCatch.perfect ? '完美收杆！' : '钓到了！'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  渔获结算
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="pixel-bob">
                  <FishIcon species={game.lastCatch.species} size={96} />
                </div>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: RARITY_INFO[game.lastCatch.species.rarity].color,
                  }}
                >
                  {game.lastCatch.species.name}
                </div>
                <div className="text-xs text-slate-400">
                  【{RARITY_INFO[game.lastCatch.species.rarity].name}】
                  {game.lastCatch.weight.toFixed(1)} kg
                </div>
                <div className="text-gold text-xl font-bold">
                  +{game.lastCatch.gold} 金币
                  {game.lastCatch.perfect && (
                    <span className="ml-1 text-xs text-pink-400">×1.5</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">已自动出售</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 离线收益弹窗 */}
      <Dialog
        open={game.offlineGain !== null}
        onOpenChange={(open) => {
          if (!open) game.setOfflineGain(null)
        }}
      >
        <DialogContent className="pixel-border-gold border-0 bg-[#1e1e2e] text-slate-200 sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-gold text-center font-mono">
              离线收益
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              你离开的时候，小玉还在努力钓鱼喵~
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-center">
            <div className="text-gold text-2xl font-bold">
              +{(game.offlineGain ?? 0).toLocaleString()} 金币
            </div>
            <button
              className="pixel-btn pixel-btn-gold mt-4 px-6 py-2 text-sm font-bold"
              onClick={() => game.setOfflineGain(null)}
            >
              收下！
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 神社落成致谢弹窗（仅建成时一次） */}
      <Dialog
        open={game.shrineThanks}
        onOpenChange={(open) => {
          if (!open) game.setShrineThanks(false)
        }}
      >
        <DialogContent className="pixel-border-gold border-0 bg-[#1e1e2e] text-slate-200 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gold text-center font-mono">
              ⛩️ 金铃神社落成！
            </DialogTitle>
            <DialogDescription className="sr-only">
              神社建成致谢
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-center text-sm leading-6 text-slate-300">
            <p>神社建好了喵——！你听见金铃的声音了吗？</p>
            <p>
              每一尾结缘的鱼、每一个陪我日出日落的你，
              小玉都好好记在心里了喵。
            </p>
            <p className="text-gold font-bold">
              从今往后，全部渔获收益 ×2！
            </p>
            <p className="text-xs text-slate-400">
              小玉获得称号「传说的钓手」，钓鱼的时候…
              也许会忍不住哼起歌来喵~♪
            </p>
            <button
              className="pixel-btn pixel-btn-gold mt-2 px-6 py-2 text-sm font-bold"
              onClick={() => game.setShrineThanks(false)}
            >
              一起守护这片池塘！
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 内幕消息弹窗（偶发，可关闭） */}
      <Dialog
        open={game.insiderTip !== null}
        onOpenChange={(open) => {
          if (!open) game.setInsiderTip(null)
        }}
      >
        <DialogContent className="pixel-border-gold border-0 bg-[#1e1e2e] text-slate-200 sm:max-w-xs">
          {game.insiderTip !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gold text-center font-mono">
                  🕵️ 内幕消息
                </DialogTitle>
                <DialogDescription className="sr-only">
                  内幕消息
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2 text-center text-sm leading-6 text-slate-300">
                <p>
                  与「
                  <span className="text-gold font-bold">
                    {STOCKS[game.insiderTip].name}
                  </span>
                  」关联的物资近期紧缺……
                </p>
                <p className="text-xs text-slate-400">
                  {STOCKS[game.insiderTip].tip}
                </p>
                <p className="text-[10px] text-slate-500">
                  （小玉竖起耳朵：听起来要涨了喵？）
                </p>
                <button
                  className="pixel-btn pixel-btn-gold mt-2 px-6 py-2 text-sm font-bold"
                  onClick={() => game.setInsiderTip(null)}
                >
                  知道了喵
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" richColors />
    </div>
  )
}
