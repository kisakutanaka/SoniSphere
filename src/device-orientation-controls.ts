import * as THREE from 'three'

// スマートフォンの向き（deviceorientationイベント）からカメラの向きを求める。
// three.jsが以前examples/jsm/controls/DeviceOrientationControls.jsとして
// 配布していた定番のアルゴリズムを、依存を増やさず自前で実装したもの
// （alpha=コンパス方位、beta=前後の傾き、gamma=左右の傾きを、画面の向き補正込みで
// カメラのクォータニオンへ変換する）。
const ZEE = new THREE.Vector3(0, 0, 1)
const euler = new THREE.Euler()
const q0 = new THREE.Quaternion()
// デバイスは「背面」を向いた姿勢が基準になるため、-90度(X軸)だけ回転して補正する。
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

function getScreenOrientationAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation) {
    return screen.orientation.angle
  }
  return 0
}

export class DeviceOrientationControls {
  private enabled = false
  private latestEvent: DeviceOrientationEvent | null = null
  private screenOrientationAngle = getScreenOrientationAngle()

  constructor(private camera: THREE.Camera) {
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this)
    this.onScreenOrientationChange = this.onScreenOrientationChange.bind(this)
  }

  static isSupported(): boolean {
    return typeof DeviceOrientationEvent !== 'undefined'
  }

  // iOSではユーザー操作（タップ）のハンドラ内で呼び出す必要がある。
  static async requestPermission(): Promise<boolean> {
    const ctor = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof ctor.requestPermission === 'function') {
      try {
        return (await ctor.requestPermission()) === 'granted'
      } catch {
        return false
      }
    }
    // Androidなど、許可リクエストの仕組みがないブラウザではそのまま利用できる。
    return true
  }

  connect() {
    window.addEventListener('orientationchange', this.onScreenOrientationChange)
    window.addEventListener('deviceorientation', this.onDeviceOrientation)
    this.enabled = true
  }

  disconnect() {
    window.removeEventListener('orientationchange', this.onScreenOrientationChange)
    window.removeEventListener('deviceorientation', this.onDeviceOrientation)
    this.enabled = false
  }

  update() {
    if (!this.enabled || !this.latestEvent) return
    const alpha = this.latestEvent.alpha ? THREE.MathUtils.degToRad(this.latestEvent.alpha) : 0
    const beta = this.latestEvent.beta ? THREE.MathUtils.degToRad(this.latestEvent.beta) : 0
    const gamma = this.latestEvent.gamma ? THREE.MathUtils.degToRad(this.latestEvent.gamma) : 0
    const orient = THREE.MathUtils.degToRad(this.screenOrientationAngle)

    euler.set(beta, alpha, -gamma, 'YXZ')
    this.camera.quaternion.setFromEuler(euler)
    this.camera.quaternion.multiply(q1)
    this.camera.quaternion.multiply(q0.setFromAxisAngle(ZEE, -orient))
  }

  private onScreenOrientationChange() {
    this.screenOrientationAngle = getScreenOrientationAngle()
  }

  private onDeviceOrientation(event: DeviceOrientationEvent) {
    this.latestEvent = event
  }
}
