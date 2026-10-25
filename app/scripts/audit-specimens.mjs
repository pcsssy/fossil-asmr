import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const items = JSON.parse(readFileSync('src/data/specimens.json', 'utf8'))
const generation = JSON.parse(readFileSync('../harness/evidence/specimen-generation.json', 'utf8'))
const errors = [], hashes = new Set(), sizes = []
for (const item of items) {
  const file = 'public' + item.image
  if (!existsSync(file)) { errors.push(item.id + ': missing image'); continue }
  const data = readFileSync(file), hash = createHash('sha256').update(data).digest('hex')
  if (hashes.has(hash)) errors.push(item.id + ': duplicate bitmap')
  hashes.add(hash)
  const meta = await sharp(data).metadata()
  if (meta.format !== 'webp' || meta.width < 700 || meta.height < 700 || !meta.hasAlpha) errors.push(item.id + ': wrong format, resolution or alpha')
  const pixels = await sharp(data).ensureAlpha().raw().toBuffer()
  let clear = 0, occupied = 0
  for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 10) clear++; if (pixels[i] > 200) occupied++ }
  if (clear < meta.width * meta.height * .02 || occupied < meta.width * meta.height * .15) errors.push(item.id + ': empty or nontransparent specimen')
  if (!generation.find(record => record.id === item.id && record.status === 'generated-integrated')) errors.push(item.id + ': missing generation provenance')
  sizes.push(statSync(file).size)
}
if (items.length !== 50 || hashes.size !== 50) errors.push('Expected 50 distinct finished bitmaps')
console.log(JSON.stringify({ items: items.length, distinctBitmaps: hashes.size, totalBytes: sizes.reduce((sum, n) => sum + n, 0), minBytes: Math.min(...sizes), maxBytes: Math.max(...sizes), errors }, null, 2))
process.exitCode = errors.length ? 1 : 0
