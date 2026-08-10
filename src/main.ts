import './style.css'
import type { Star } from './types'
import { initScene } from './scene'
import { SpatialAudio } from './audio'

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
  const container = document.querySelector<HTMLDivElement>('#scene-container')!
  initScene(container, stars, (camera) => audio.updateListenerFromCamera(camera))

  document.querySelector<HTMLParagraphElement>('#status')!.textContent =
    `${stars.length}個の星を表示中（ドラッグ/スワイプで見回せます）`

  const overlay = document.querySelector<HTMLDivElement>('#start-overlay')!
  const startButton = document.querySelector<HTMLButtonElement>('#start-button')!
  startButton.addEventListener('click', async () => {
    await audio.resume()
    overlay.remove()
    audio.playBellAt(brightest.dir)
    addTestToneButton(audio, brightest)
  })
}

function addTestToneButton(audio: SpatialAudio, star: Star) {
  const button = document.createElement('button')
  button.id = 'test-tone-button'
  button.textContent = 'テスト音を鳴らす（最も明るい星）'
  button.addEventListener('click', () => audio.playBellAt(star.dir))
  app.appendChild(button)
}

main()
