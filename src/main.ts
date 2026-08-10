import './style.css'
import type { Star } from './types'
import { initScene } from './scene'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="scene-container"></div>
  <p id="status">星カタログを読み込み中...</p>
`

async function main() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/stars.json`)
  const stars: Star[] = await res.json()

  const container = document.querySelector<HTMLDivElement>('#scene-container')!
  initScene(container, stars)

  document.querySelector<HTMLParagraphElement>('#status')!.textContent =
    `${stars.length}個の星を表示中（ドラッグ/スワイプで見回せます）`
}

main()
