// 角色页：小玉档案 + 实时数据
import { FISH_MAP } from '@/game/fish'
import FishIcon from '@/components/FishIcon'
import type { CodexEntry } from '@/hooks/useFishingGame'

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h} 小时 ${m} 分`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

export default function CharacterSection({
  totalCatches,
  totalGoldEarned,
  playSeconds,
  codex,
  shrineBuilt,
  shrineCompletedGold,
}: {
  totalCatches: number
  totalGoldEarned: number
  playSeconds: number
  codex: Record<string, CodexEntry>
  shrineBuilt: boolean
  shrineCompletedGold: number | null
}) {
  // 最爱渔获 = 捕获次数最多的鱼
  let favorite: { id: string; count: number } | null = null
  for (const [id, e] of Object.entries(codex)) {
    if (!favorite || e.count > favorite.count) favorite = { id, count: e.count }
  }
  const favSpecies = favorite ? FISH_MAP.get(favorite.id) : undefined

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="pixel-border-gold shrink-0 self-start p-1">
        <img
          src="./neko-portrait.jpg"
          alt="小玉"
          className="pixelated block w-48 sm:w-56"
        />
        <div className="mt-1 bg-[#1e1e2e] py-1 text-center">
          <span className="text-gold text-lg font-bold">小玉</span>
          <span className="ml-2 text-xs text-slate-400">Xiaoyu</span>
        </div>
      </div>
      <div className="pixel-panel flex-1 p-4">
        <p className="text-sm leading-6 text-slate-300">
          住在樱花溪边小镇的猫娘少女，奶油色短发上盖着一大块三毛猫黑斑，
          右耳别着粉白蓝的大花饰。红项圈上的金铃叮当作响，肩上注连绳垂着成对的金铃红流苏。
          身旁总飘着猪猪气球「小超」，今天也坐在溪边石头上悠哉垂钓——喵~
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="pixel-panel p-3">
            <div className="text-xs text-slate-400">总捕获</div>
            <div className="text-gold mt-1 text-lg font-bold">{totalCatches} 条</div>
          </div>
          <div className="pixel-panel p-3">
            <div className="text-xs text-slate-400">累计金币</div>
            <div className="text-gold mt-1 text-lg font-bold">
              {totalGoldEarned.toLocaleString()}
            </div>
          </div>
          <div className="pixel-panel p-3">
            <div className="text-xs text-slate-400">游玩时长</div>
            <div className="mt-1 text-lg font-bold text-emerald-300">
              {fmtTime(playSeconds)}
            </div>
          </div>
          <div className="pixel-panel p-3">
            <div className="text-xs text-slate-400">最爱渔获</div>
            {favSpecies ? (
              <div className="mt-1 flex items-center gap-2">
                <FishIcon species={favSpecies} size={40} />
                <span className="font-bold text-white">
                  {favSpecies.name}
                  <span className="ml-1 text-xs text-slate-400">
                    ×{favorite!.count}
                  </span>
                </span>
              </div>
            ) : (
              <div className="mt-1 text-slate-500">还没有渔获</div>
            )}
          </div>
        </div>

        {/* 生涯成就 */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-bold text-slate-400">生涯成就</div>
          <div
            className={`pixel-panel flex items-center gap-3 p-3 ${shrineBuilt ? 'pixel-border-gold' : 'opacity-60'}`}
          >
            <span className="text-2xl">⛩️</span>
            <div className="flex-1">
              <div
                className={`text-sm font-bold ${shrineBuilt ? 'text-gold' : 'text-slate-400'}`}
              >
                结缘金铃神社
                {shrineBuilt && (
                  <span className="ml-2 text-[10px] text-pink-300">
                    「传说的钓手」
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {shrineBuilt
                  ? `已建成 · 永久收益 ×2${shrineCompletedGold != null ? ` · 落成时累计金币 ${shrineCompletedGold.toLocaleString()}` : ''}`
                  : '尚未建成 · 在商店为小玉攒一座神社吧'}
              </div>
            </div>
            {shrineBuilt && <span className="text-gold text-lg">✓</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
