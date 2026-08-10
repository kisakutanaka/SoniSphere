import * as THREE from 'three'
import type { Star } from './types'

// 星の音は外部音源を使わず、非整数倍音のサイン波を重ねてベル/グロッケン風に
// その場で合成する（Plan.mdの「キラキラした音」方針、軽量・同梱不要にするため）。
const BELL_PARTIALS = [1, 2.41, 3.83, 5.43]

// 音源を天球上のどの半径に置くか。視覚上の天球（SPHERE_RADIUS=50）とは独立で、
// PannerNodeのHRTF定位が効きやすい距離感に合わせる。
const AUDIO_RADIUS = 8

// 明るさ(vmag)→音量(dB)・余韻(秒)のマッピング範囲。
// 等級と音量(dB)はどちらも対数尺度なので、等級を線形にdBへ写すのは
// 「等級差が一定なら聴感上のラウドネス差も一定」という素直な対応になる
// （Findings.md参照）。
const GAIN_DB_AT_BRIGHTEST = -2
const GAIN_DB_AT_DIMMEST = -20
const DURATION_AT_BRIGHTEST = 2.2
const DURATION_AT_DIMMEST = 0.7

// 色(B-V)→音色(高次倍音の効かせ方)のマッピング範囲。
// B-Vが小さい(負)ほど青く高温、大きいほど赤く低温な星に対応する。
// 青い星は明るい（倍音が効いた）音色、赤い星はこもった（倍音が抑えられた）音色にする。
const BRIGHTNESS_AT_BLUEST = 1.4
const BRIGHTNESS_AT_REDDEST = 0.7

// 色(B-V)→音域（ペンタトニックスケール上の音程）のマッピングに使う音階。
// 多数の星が同時に鳴っても不協和になりにくいよう、半音階ではなく
// 長調ペンタトニック（ルートから見て0,2,4,7,9半音＝短2度・トライトーンを含まない
// 音階）の音だけを使う。青い星ほど高い音、赤い星ほど低い音に量子化する。
const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9]
const SCALE_ROOT_FREQ = 440
const SCALE_OCTAVE_SPAN = 1
const SCALE_FREQ_MIN = 330
const SCALE_FREQ_MAX = 990

function buildPentatonicScale(): number[] {
  const notes: number[] = []
  for (let octave = -SCALE_OCTAVE_SPAN; octave <= SCALE_OCTAVE_SPAN; octave++) {
    for (const interval of PENTATONIC_INTERVALS) {
      const freq = SCALE_ROOT_FREQ * 2 ** octave * 2 ** (interval / 12)
      if (freq >= SCALE_FREQ_MIN && freq <= SCALE_FREQ_MAX) notes.push(freq)
    }
  }
  return notes.sort((a, b) => a - b)
}

const PENTATONIC_SCALE = buildPentatonicScale()

interface Range {
  min: number
  max: number
}

function mapRange(value: number, from: Range, to: Range): number {
  if (from.max === from.min) return (to.min + to.max) / 2
  const t = (value - from.min) / (from.max - from.min)
  return THREE.MathUtils.clamp(THREE.MathUtils.lerp(to.min, to.max, t), Math.min(to.min, to.max), Math.max(to.min, to.max))
}

function dbToGain(db: number): number {
  return 10 ** (db / 20)
}

export class SpatialAudio {
  private ctx: AudioContext
  private vmagRange: Range = { min: 0, max: 1 }
  private bvRange: Range = { min: 0, max: 1 }

  constructor() {
    this.ctx = new AudioContext()
  }

  async resume() {
    await this.ctx.resume()
  }

  // 星カタログ全体でのvmag/bvの分布を記録する。以後の音響パラメータ計算は
  // この分布の中での相対位置（このカタログの中で何番目に明るい/赤いか）を
  // 基準にする。
  setCatalogRange(stars: Star[]) {
    const vmags = stars.map((s) => s.vmag)
    const bvs = stars.map((s) => s.bv)
    this.vmagRange = { min: Math.min(...vmags), max: Math.max(...vmags) }
    this.bvRange = { min: Math.min(...bvs), max: Math.max(...bvs) }
  }

  // カメラの向きをWeb Audio APIのAudioListenerへ反映する。
  // カメラは原点に固定されている前提（LookControls参照）。
  updateListenerFromCamera(camera: THREE.Camera) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    const listener = this.ctx.listener

    if (listener.positionX) {
      const now = this.ctx.currentTime
      listener.positionX.setValueAtTime(0, now)
      listener.positionY.setValueAtTime(0, now)
      listener.positionZ.setValueAtTime(0, now)
      listener.forwardX.setValueAtTime(forward.x, now)
      listener.forwardY.setValueAtTime(forward.y, now)
      listener.forwardZ.setValueAtTime(forward.z, now)
      listener.upX.setValueAtTime(up.x, now)
      listener.upY.setValueAtTime(up.y, now)
      listener.upZ.setValueAtTime(up.z, now)
    } else {
      // Safari等、AudioParam版が無い実装向けのフォールバック
      listener.setPosition(0, 0, 0)
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z)
    }
  }

  // 星の明るさ・色に応じた音を、星の方向からベル音として鳴らす。
  // delaySecでスケジュール開始を遅らせられる（複数星の聴き比べ用）。
  playStar(star: Star, delaySec = 0) {
    const now = this.ctx.currentTime + delaySec

    const gainDb = mapRange(
      star.vmag,
      this.vmagRange,
      { min: GAIN_DB_AT_BRIGHTEST, max: GAIN_DB_AT_DIMMEST },
    )
    const duration = mapRange(
      star.vmag,
      this.vmagRange,
      { min: DURATION_AT_BRIGHTEST, max: DURATION_AT_DIMMEST },
    )
    const noteIndex = Math.round(
      mapRange(star.bv, this.bvRange, { min: PENTATONIC_SCALE.length - 1, max: 0 }),
    )
    const fundamental = PENTATONIC_SCALE[noteIndex]
    const brightness = mapRange(
      star.bv,
      this.bvRange,
      { min: BRIGHTNESS_AT_BLUEST, max: BRIGHTNESS_AT_REDDEST },
    )

    const panner = new PannerNode(this.ctx, {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      positionX: star.dir[0] * AUDIO_RADIUS,
      positionY: star.dir[1] * AUDIO_RADIUS,
      positionZ: star.dir[2] * AUDIO_RADIUS,
    })
    panner.connect(this.ctx.destination)

    const peakGain = dbToGain(gainDb)
    const envelope = this.ctx.createGain()
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(peakGain, now + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    envelope.connect(panner)

    BELL_PARTIALS.forEach((mult, i) => {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = fundamental * mult

      // brightnessが高いほど高次倍音の減衰が緩やかになり、明るい（青い星の）音色になる。
      const partialGain = this.ctx.createGain()
      partialGain.gain.value = brightness ** i / (i + 1)

      osc.connect(partialGain)
      partialGain.connect(envelope)
      osc.start(now)
      osc.stop(now + duration + 0.1)
    })
  }
}
