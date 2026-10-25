import { readFile, writeFile, access } from 'node:fs/promises'

const root = new URL('../../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('harness/evidence/specimen-generation.json', root), 'utf8'))
const items = Array.isArray(manifest) ? manifest : manifest.items
if (!items || items.length !== 50 || items.some(item => item.status !== 'generated-integrated')) {
  throw Error('Finish every specimen image before synchronizing provenance')
}
for (const item of items) await access(new URL(item.outputPath, root))
const path = new URL('harness/asset-register.json', root)
const register = JSON.parse(await readFile(path, 'utf8'))
register.assets = register.assets.filter(asset => !/^specimen-\d{3}-image$/.test(asset.id))
register.assets.push(...items.map(item => ({
  id: item.id + '-image', kind: 'generated-image', path: item.outputPath,
  origin: 'Built-in image_gen; original source preserved: ' + item.sourcePath,
  sourceUrl: null, license: 'Generated project asset; applicable OpenAI service terms',
  attribution: 'AI-generated visual reconstruction; not an authenticated scientific specimen photograph',
  status: 'provisional', reviewedAt: '2026-10-24',
  reviewNotes: 'Integrated as individual transparent WebP. Prompt and encoding metadata: harness/evidence/specimen-generation.json. Scientific authentication and phone review remain pending.',
})))
register.notes = '50 individual specimen WebPs, 2 original PNG sources/textures and 1 procedural audio source. Images are reconstructions; audio is synthetic and provisional.'
await writeFile(path, JSON.stringify(register, null, 2) + '\n')
const catalogPath = new URL('harness/catalog-draft.json', root)
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
catalog.status = 'normalized-runtime-integrated'
catalog.items = catalog.items.map(item => ({ ...item, assetStatus: 'integrated' }))
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
console.log('Registered all 50 specimen assets; total assets:', register.assets.length)
