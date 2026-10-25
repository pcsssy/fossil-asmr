type Name = 'home' | 'hammer' | 'book' | 'sound' | 'mute' | 'settings' | 'arrow' | 'back' | 'brush' | 'reset' | 'close' | 'check' | 'leaf' | 'expand'
const paths: Record<Name, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
  hammer: <><path d="m7 3 4 2 6 6-4 4-6-6-4-2Z"/><path d="m12 14-7 7-2-2 7-7M17 9l3-3 2 2-3 3"/></>,
  book: <><path d="M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/></>,
  sound: <><path d="m4 9 4 0 5-4v14l-5-4H4Z"/><path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute: <><path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="m17 9 5 6m0-6-5 6"/></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h5l1-3 3-1 3-4-2-2V8l-3-2-1-3Z"/><circle cx="11.5" cy="12" r="3"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  back: <path d="m15 5-7 7 7 7"/>,
  brush: <><path d="m14 4 4-2 4 4-2 4-9 9-6-6Z"/><path d="M5 13c-4 2 0 5-3 9 6 1 10-3 9-6"/></>,
  reset: <><path d="M4 9a9 9 0 1 1 1 9M4 3v6h6"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  leaf: <><path d="M20 3C5 2 2 10 7 16c5 6 14 0 13-13ZM4 21 16 8"/></>,
  expand: <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>,
}
export default function Icon({ name, size = 22 }: { name: Name; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
