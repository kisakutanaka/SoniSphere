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

// 聴き比べボタン用に、明るさ順に並んだ星から等間隔に代表サンプルを取り出す。
// フルカタログ（約300件）をそのまま鳴らすと再生に何分もかかってしまうため。
const SAMPLE_SIZE = 20

function sampleEvenly(stars: Star[], count: number): Star[] {
  if (stars.length <= count) return stars
  return Array.from({ length: count }, (_, i) =>
    stars[Math.round((i * (stars.length - 1)) / (count - 1))],
  )
}

function addTestButtons(audio: SpatialAudio, stars: Star[]) {
  const controls = document.createElement('div')
  controls.id = 'test-controls'
  const sample = sampleEvenly(stars, SAMPLE_SIZE)

  const singleButton = document.createElement('button')
  singleButton.textContent = 'テスト音を鳴らす（最も明るい星）'
  singleButton.addEventListener('click', () => audio.playStar(stars[0]))

  const allButton = document.createElement('button')
  allButton.textContent = `代表的な${sample.length}個を聴き比べる`
  allButton.addEventListener('click', () => {
    sample.forEach((star, i) => audio.playStar(star, i * 0.15))
  })

  // 前の星の余韻がおおよそ収まってから次が鳴るよう間隔を空け、
  // 一つずつの音の違いを聴き取りやすくする（重なりの少ないメロディ的な聴き方）。
  const SEQUENTIAL_GAP_SEC = 1.5
  const sequentialButton = document.createElement('button')
  sequentialButton.textContent = '一個ずつ順番に鳴らす'
  sequentialButton.addEventListener('click', () => {
    sample.forEach((star, i) => audio.playStar(star, i * SEQUENTIAL_GAP_SEC))
  })

  controls.append(singleButton, allButton, sequentialButton)
  app.appendChild(controls)
}

main()
