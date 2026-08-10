import * as THREE from 'three'

// 星の音は外部音源を使わず、非整数倍音のサイン波を重ねてベル/グロッケン風に
// その場で合成する（Plan.mdの「キラキラした音」方針、軽量・同梱不要にするため）。
const BELL_PARTIALS = [1, 2.41, 3.83, 5.43]
const BELL_DURATION = 1.4

// 音源を天球上のどの半径に置くか。視覚上の天球（SPHERE_RADIUS=50）とは独立で、
// PannerNodeのHRTF定位が効きやすい距離感に合わせる。
const AUDIO_RADIUS = 8

export class SpatialAudio {
  private ctx: AudioContext

  constructor() {
    this.ctx = new AudioContext()
  }

  async resume() {
    await this.ctx.resume()
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

  // 星の方向(単位ベクトル)からベル音を1回鳴らす。
  playBellAt(dir: readonly [number, number, number]) {
    const now = this.ctx.currentTime
    const panner = new PannerNode(this.ctx, {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      positionX: dir[0] * AUDIO_RADIUS,
      positionY: dir[1] * AUDIO_RADIUS,
      positionZ: dir[2] * AUDIO_RADIUS,
    })
    panner.connect(this.ctx.destination)

    const envelope = this.ctx.createGain()
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(0.35, now + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + BELL_DURATION)
    envelope.connect(panner)

    const fundamental = 660
    BELL_PARTIALS.forEach((mult, i) => {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = fundamental * mult

      const partialGain = this.ctx.createGain()
      partialGain.gain.value = 1 / (i + 1)

      osc.connect(partialGain)
      partialGain.connect(envelope)
      osc.start(now)
      osc.stop(now + BELL_DURATION + 0.1)
    })
  }
}
