// Gaia由来の恒星カタログCSVを、アプリで使う軽量JSONへ変換するビルド時スクリプト。
// 実行: npm run build:catalog
//
// Phase 1時点では縦の筋を通すため、最も明るい上位STAR_LIMIT個のみを対象とする。
// Phase 7でフルカタログへ拡張する（Step.md参照）。

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_CSV = path.join(__dirname, '../gaia_catalog/bright_stars_v3.5.csv')
const OUT_JSON = path.join(__dirname, '../public/data/stars.json')
const STAR_LIMIT = 20

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split('\n')
  const headers = headerLine.split(',')
  return lines.map((line) => {
    const values = line.split(',')
    const row = {}
    headers.forEach((h, i) => {
      row[h] = Number(values[i])
    })
    return row
  })
}

// 赤経(ra)・赤緯(dec、共に度)を、天球上の単位ベクトル(x, y, z)に変換する。
// dec=+90度(天の北極)をz=+1とする右手系。
function equatorialToUnitVector(raDeg, decDeg) {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  return [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ]
}

const rows = parseCsv(readFileSync(SRC_CSV, 'utf-8'))

const stars = rows
  .sort((a, b) => a.vmag - b.vmag) // 明るい(vmagが小さい)順
  .slice(0, STAR_LIMIT)
  .map((row, i) => ({
    id: i,
    ra: row.ra,
    dec: row.dec,
    vmag: row.vmag,
    bv: row.bv,
    dir: equatorialToUnitVector(row.ra, row.dec),
  }))

writeFileSync(OUT_JSON, JSON.stringify(stars, null, 2) + '\n')
console.log(`${stars.length}件の星を${OUT_JSON}へ出力しました（元データ${rows.length}件中）`)
