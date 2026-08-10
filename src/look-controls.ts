import * as THREE from 'three'

// 天球の内側にいる視点を想定した見回し操作。
// カメラを原点に固定したまま、ドラッグ量に応じてyaw/pitchを回転させる
// （外部の対象を周回するOrbitControlsとは逆の「内側から見回す」操作）。
// マウス/タッチの両方をPointer Eventsで統一的に扱う。
export class LookControls {
  private yaw = 0
  private pitch = 0
  private dragging = false
  private lastX = 0
  private lastY = 0

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
  ) {
    domElement.addEventListener('pointerdown', this.onPointerDown)
    domElement.addEventListener('pointermove', this.onPointerMove)
    domElement.addEventListener('pointerup', this.onPointerUp)
    domElement.addEventListener('pointercancel', this.onPointerUp)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.domElement.setPointerCapture(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY

    const ROTATE_SPEED = 0.005
    this.yaw -= dx * ROTATE_SPEED
    this.pitch -= dy * ROTATE_SPEED
    const PITCH_LIMIT = Math.PI / 2 - 0.01
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch))

    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }

  private onPointerUp = () => {
    this.dragging = false
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.domElement.removeEventListener('pointercancel', this.onPointerUp)
  }
}
