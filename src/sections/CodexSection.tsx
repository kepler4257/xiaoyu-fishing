// 图鉴：全部鱼类，未捕获显示剪影，可按钓场筛选
import { useState } from 'react'
import { FISH_SPECIES, RARITY_INFO } from '@/game/fish'
import { SPOTS, SPOT_MAP } from '@/game/spots'
import FishIcon from '@/components/FishIcon'
import type { CodexEntry } from '@/hooks/useFishingGame'

export default function CodexSection({
  codex,
}: {
  codex: Record<string, CodexEntry>
}) {
  const [spotFilter, setSpotFilter] = useState<string>('all')
  const caught = FISH_SPECIES.filter((f) => codex[f.id]).length
  const list =
    spotFilter === 'all'
      ? FISH_SPECIES
      : FISH_SPECIES.filter((f) => f.spot === spotFilter)
  const listCaught = list.filter((f) => codex[f.id]).length
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-300">
          收集进度：<span className="text-gold font-bold">{caught}/{FISH_SPECIES.length}</span>
        </span>
        <div className="pixel-panel h-3 w-40 overflow-hidden">
          <div
            className="h-full bg-yellow-400"
            style={{ width: `${(caught / FISH_SPECIES.length) * 100}%` }}
          />
        </div>
      </div>
      {/* 钓场筛选 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {[{ id: 'all', name: '全部' }, ...SPOTS].map((s) => (
          <button
            key={s.id}
            onClick={() => setSpotFilter(s.id)}
            className={`pixel-btn px-3 py-1 text-xs font-bold ${
              spotFilter === s.id ? 'pixel-btn-gold' : ''
            }`}
          >
            {s.name}
          </button>
        ))}
        {spotFilter !== 'all' && (
          <span className="self-center text-[10px] text-slate-500">
            本钓场 {listCaught}/{list.length}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.map((f) => {
          const entry = codex[f.id]
          const known = !!entry
          const info = RARITY_INFO[f.rarity]
          return (
            <div
              key={f.id}
              className="pixel-panel flex flex-col items-center p-3 text-center"
            >
              <FishIcon species={f} size={56} silhouette={!known} />
              <div
                className="mt-2 text-sm font-bold"
                style={{ color: known ? info.color : '#6a6a8a' }}
              >
                {known ? f.name : '？？？'}
              </div>
              <div className="text-[10px]" style={{ color: info.color }}>
                【{info.name}】
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                📍 {SPOT_MAP.get(f.spot)?.name ?? f.spot}
              </div>
              {known ? (
                <>
                  <div className="mt-1 text-[11px] text-slate-400">
                    捕获 {entry.count} 条 · 最大 {entry.maxWeight.toFixed(1)}kg
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    {f.desc}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px] text-slate-600">尚未捕获</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
