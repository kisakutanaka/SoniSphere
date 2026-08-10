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

  // フルカタログ（Phase 7で約300件）でも描画コストを抑えるため、星ごとに
  // Meshを作らずInstancedMeshへまとめる（ドローコールが星の数によらず1回になる）。
  const geometry = new THREE.SphereGeometry(1, 8, 8)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const instancedStars = new THREE.InstancedMesh(geometry, material, stars.length)
  const dummy = new THREE.Object3D()
  stars.forEach((star, i) => {
    // 明るい星（vmagが小さい）ほど大きく描画する簡易表現（Phase 2時点の仮実装）。
    const size = THREE.MathUtils.mapLinear(star.vmag, vmagMin, vmagMax, 0.6, 0.15)
    const [x, y, z] = star.dir
    dummy.position.set(x * SPHERE_RADIUS, y * SPHERE_RADIUS, z * SPHERE_RADIUS)
    dummy.scale.setScalar(size)
    dummy.updateMatrix()
    instancedStars.setMatrixAt(i, dummy.matrix)
  })
  scene.add(instancedStars)

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
