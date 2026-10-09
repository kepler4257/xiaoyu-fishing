// WebAudio 像素音效：首次用户交互后才初始化，可静音

let audioCtx: AudioContext | null = null
let muted = false
let unlocked = false

export function setMuted(m: boolean) {
  muted = m
  // BGM 跟随音效开关：静音立即停唱，取消静音且该唱时恢复
  if (m) bgmEl?.pause()
  else if (songWanted) tryPlayBgm()
}

export function isMuted() {
  return muted
}

/** 必须在用户手势中调用，解锁 AudioContext */
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new AC()
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    resumeSongIfWanted()
  } catch {
    audioCtx = null
  }
}

function blip(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.08,
  slideTo?: number,
  delay = 0,
) {
  if (muted || !audioCtx) return
  try {
    const t0 = audioCtx.currentTime + delay
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration)
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click() {
    blip(660, 0.05, 'square', 0.05)
  },
  cast() {
    blip(300, 0.18, 'triangle', 0.09, 700)
  },
  bite() {
    blip(880, 0.09, 'square', 0.1)
    blip(1174, 0.12, 'square', 0.1, undefined, 0.1)
  },
  catch() {
    blip(523, 0.1, 'square', 0.09)
    blip(659, 0.1, 'square', 0.09, undefined, 0.09)
    blip(784, 0.16, 'square', 0.09, undefined, 0.18)
  },
  perfect() {
    blip(659, 0.08, 'square', 0.1)
    blip(880, 0.08, 'square', 0.1, undefined, 0.08)
    blip(1174, 0.08, 'square', 0.1, undefined, 0.16)
    blip(1568, 0.2, 'square', 0.1, undefined, 0.24)
  },
  purchase() {
    blip(440, 0.08, 'triangle', 0.1)
    blip(880, 0.14, 'triangle', 0.1, undefined, 0.08)
  },
  denied() {
    blip(220, 0.15, 'sawtooth', 0.07, 140)
  },
  /** 神社建成庆典号角 */
  fanfare() {
    const seq = [523, 659, 784, 1046, 784, 1046, 1318]
    seq.forEach((f, i) => blip(f, 0.16, 'square', 0.09, undefined, i * 0.11))
    // 结尾和弦
    blip(523, 0.55, 'triangle', 0.06, undefined, 0.85)
    blip(659, 0.55, 'triangle', 0.06, undefined, 0.85)
    blip(784, 0.65, 'triangle', 0.07, undefined, 0.85)
  },
}

// ---------- 小玉的歌：神社建成后垂钓时循环播放的 BGM ----------
// 用户提供的音频文件，<audio> 循环播放；沿用 startSong/stopSong 调用约定
import shrineBgmUrl from '@/assets/shrine-bgm.mp3'

let songWanted = false
let bgmEl: HTMLAudioElement | null = null

function getBgm(): HTMLAudioElement {
  if (!bgmEl) {
    bgmEl = new Audio(shrineBgmUrl)
    bgmEl.loop = true
    bgmEl.volume = 0.45
    bgmEl.preload = 'auto'
  }
  return bgmEl
}

function tryPlayBgm() {
  if (!unlocked || muted) return
  const el = getBgm()
  if (!el.paused) return // 防叠音：切钓场/标签重复调用只播一份
  void el.play().catch(() => {
    /* 浏览器尚未放行时静默等下一次手势 */
  })
}

/** 想唱歌时调用；音频未解锁时先记账，解锁后立即开始 */
export function startSong() {
  songWanted = true
  tryPlayBgm()
}

export function stopSong() {
  songWanted = false
  bgmEl?.pause()
}

/** 解锁后若有待播的歌则开始（供 unlockAudio 调用） */
export function resumeSongIfWanted() {
  if (songWanted) tryPlayBgm()
}
