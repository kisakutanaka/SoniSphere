import './style.css'
import type { Star } from './types'
import { initScene } from './scene'
import { SpatialAudio } from './audio'
import { Soundscape, DENSITY_MIN, DENSITY_MAX, DENSITY_DEFAULT } from './soundscape'

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
    const soundscape = new Soundscape(audio, stars)
    soundscape.start()
    addTestButtons(audio, stars)
    addDensitySlider(soundscape)
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

function addDensitySlider(soundscape: Soundscape) {
  const wrapper = document.createElement('div')
  wrapper.id = 'density-control'

  const label = document.createElement('label')
  label.htmlFor = 'density-slider'
  const valueText = document.createElement('span')
  valueText.textContent = `x${DENSITY_DEFAULT.toFixed(2)}`
  label.textContent = '瞬きの頻度 '
  label.appendChild(valueText)

  const slider = document.createElement('input')
  slider.id = 'density-slider'
  slider.type = 'range'
  slider.min = String(DENSITY_MIN)
  slider.max = String(DENSITY_MAX)
  slider.step = '0.25'
  slider.value = String(DENSITY_DEFAULT)
  slider.addEventListener('input', () => {
    const density = Number(slider.value)
    valueText.textContent = `x${density.toFixed(2)}`
    soundscape.setDensity(density)
  })

  wrapper.append(label, slider)
  app.appendChild(wrapper)
}

main()
