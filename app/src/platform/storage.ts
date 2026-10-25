import { getSpecimen } from '../domain/collection.ts'
export type Preferences = { muted: boolean; volume: number; reducedMotion: boolean; quality: 'high' | 'low' }
export type Discovery = { count: number; firstFound: string; lastFound: string }
export type Journal = { version: 2; count: number; firstFound: string | null; lastSession: string | null; discoveries: Record<string, Discovery>; recentSessions: string[] }
export const defaults: Preferences = { muted: false, volume: .55, reducedMotion: false, quality: 'high' }
export const emptyJournal: Journal = { version: 2, count: 0, firstFound: null, lastSession: null, discoveries: {}, recentSessions: [] }
// Keep the existing key; schema migration preserves old ammonite progress.
const KEY = 'fossil-asmr:prototype:v1'
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function readSaved(): { preferences: Preferences; journal: Journal } {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!data || ![1, 2].includes(data.version)) return { preferences: defaults, journal: emptyJournal }
    const p = data.preferences || {}, j = data.journal || {}
    const preferences: Preferences = {
      muted: typeof p.muted === 'boolean' ? p.muted : defaults.muted,
      volume: Number.isFinite(p.volume) ? Math.max(0, Math.min(1, p.volume)) : defaults.volume,
      reducedMotion: typeof p.reducedMotion === 'boolean' ? p.reducedMotion : defaults.reducedMotion,
      quality: p.quality === 'low' ? 'low' : 'high',
    }
    const lastSession = typeof j.lastSession === 'string' ? j.lastSession : null
    if (j.version === 1 && Number.isInteger(j.count) && j.count > 0 && validDate(j.firstFound)) {
      return { preferences, journal: { version: 2, count: j.count, firstFound: j.firstFound, lastSession,
        discoveries: { 'specimen-011': { count: j.count, firstFound: j.firstFound, lastFound: j.firstFound } },
        recentSessions: lastSession ? [lastSession] : [] } }
    }
    if (j.version !== 2 || !j.discoveries || typeof j.discoveries !== 'object') return { preferences, journal: emptyJournal }
    const discoveries: Record<string, Discovery> = {}
    for (const [id, raw] of Object.entries(j.discoveries)) {
      const value = raw as Partial<Discovery> | null
      if (getSpecimen(id) && value && Number.isInteger(value.count) && value.count! > 0 && validDate(value.firstFound) && validDate(value.lastFound)) {
        discoveries[id] = { count: value.count!, firstFound: value.firstFound, lastFound: value.lastFound }
      }
    }
    const count = Object.values(discoveries).reduce((sum, item) => sum + item.count, 0)
    const firstFound = Object.values(discoveries).map(item => item.firstFound).sort()[0] || null
    const recentSessions = Array.isArray(j.recentSessions) ? j.recentSessions.filter((value: unknown) => typeof value === 'string').slice(-128) : lastSession ? [lastSession] : []
    return { preferences, journal: { version: 2, discoveries, count, firstFound, lastSession, recentSessions } }
  } catch { return { preferences: defaults, journal: emptyJournal } }
}

export function save(preferences: Preferences, journal: Journal): boolean {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 2, preferences, journal })); return true } catch { return false }
}

export function registerDiscovery(journal: Journal, session: string, now = new Date().toISOString(), specimenId = 'specimen-011'): Journal {
  if (!getSpecimen(specimenId) || journal.recentSessions.includes(session) || journal.lastSession === session) return journal
  const old = journal.discoveries[specimenId]
  return { version: 2, count: journal.count + 1, firstFound: journal.firstFound || now, lastSession: session,
    recentSessions: [...journal.recentSessions, session].slice(-128),
    discoveries: { ...journal.discoveries, [specimenId]: { count: (old?.count || 0) + 1, firstFound: old?.firstFound || now, lastFound: now } } }
}
