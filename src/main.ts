import './style.css'
import type { Star } from './types'
import { initScene } from './scene'
import { SpatialAudio } from './audio'
import { Soundscape } from './soundscape'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="scene-container"></div>
  <p id="status">星カタログを読み込み中...</p>
  <div id="start-overlay">
    <button id="start-button">タップして音を有効にする</button>
  </div>
`

async function main() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/stars.json`)
  const stars: Star[] = await res.json()
  const brightest = stars[0]

  const audio = new SpatialAudio()
  audio.setCatalogRange(stars)
  const container = document.querySelector<HTMLDivElement>('#scene-container')!
  initScene(container, stars, (camera) => audio.updateListenerFromCamera(camera))

  document.querySelector<HTMLParagraphElement>('#status')!.textContent =
    `${stars.length}個の星を表示中（ドラッグ/スワイプで見回せます）`

  const overlay = document.querySelector<HTMLDivElement>('#start-overlay')!
  const startButton = document.querySelector<HTMLButtonElement>('#start-button')!
  startButton.addEventListener('click', async () => {
    await audio.resume()
    overlay.remove()
    audio.playStar(brightest)
    new Soundscape(audio, stars).start()
    addTestButtons(audio, stars)
  })
}

function addTestButtons(audio: SpatialAudio, stars: Star[]) {
  const controls = document.createElement('div')
  controls.id = 'test-controls'

  const singleButton = document.createElement('button')
  singleButton.textContent = 'テスト音を鳴らす（最も明るい星）'
  singleButton.addEventListener('click', () => audio.playStar(stars[0]))

  const allButton = document.createElement('button')
  allButton.textContent = '全ての星を聴き比べる'
  allButton.addEventListener('click', () => {
    stars.forEach((star, i) => audio.playStar(star, i * 0.15))
  })

  controls.append(singleButton, allButton)
  app.appendChild(controls)
}

main()
