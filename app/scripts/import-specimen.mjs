import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const [id, source] = process.argv.slice(2)
if (!/^specimen-\d{3}$/.test(id || '') || !source || !existsSync(source)) throw Error('Usage: node scripts/import-specimen.mjs specimen-NNN source.png')
const output = 'public/assets/specimens/' + id + '.webp'
const metadata = await sharp(source).metadata()
await sharp(source).resize(768, 768, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 87, effort: 5, alphaQuality: 95 }).toFile(output)
const path = '../harness/evidence/specimen-generation.json'
const records = JSON.parse(readFileSync(path, 'utf8'))
const item = records.find(item => item.id === id)
if (!item) throw Error('Unknown specimen')
Object.assign(item, { status: 'generated-integrated', sourcePath: source, outputPath: 'app/' + output, width: metadata.width, height: metadata.height, alpha: metadata.hasAlpha, tool: 'built-in image_gen', generatedAt: '2026-10-24' })
writeFileSync(path, JSON.stringify(records, null, 2) + '\n')
console.log(id + ' -> ' + output)
