import * as THREE from 'three'
import type { Star } from './types'
import { LookControls } from './look-controls'

// 星を配置する天球の半径。カメラは原点付近に置き、内側から見回す構成にする。
const SPHERE_RADIUS = 50

export function initScene(
  container: HTMLElement,
  stars: Star[],
  onTick?: (camera: THREE.PerspectiveCamera) => void,
) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02020a)

  const camera = new THREE.PerspectiveCamera(
    70,
    container.clientWidth / container.clientHeight,
    0.1,
    SPHERE_RADIUS * 2,
  )

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const controls = new LookControls(camera, renderer.domElement)

  const vmags = stars.map((s) => s.vmag)
  const vmagMin = Math.min(...vmags)
  const vmagMax = Math.max(...vmags)

  for (const star of stars) {
    // 明るい星（vmagが小さい）ほど大きく描画する簡易表現（Phase 2時点の仮実装）。
    const size = THREE.MathUtils.mapLinear(star.vmag, vmagMin, vmagMax, 0.6, 0.15)
    const geometry = new THREE.SphereGeometry(size, 8, 8)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.Mesh(geometry, material)
    const [x, y, z] = star.dir
    mesh.position.set(x * SPHERE_RADIUS, y * SPHERE_RADIUS, z * SPHERE_RADIUS)
    scene.add(mesh)
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  function animate() {
    requestAnimationFrame(animate)
    onTick?.(camera)
    renderer.render(scene, camera)
  }
  animate()

  return { scene, camera, renderer, controls }
}
