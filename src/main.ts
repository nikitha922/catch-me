import './style.css'
import { watchDevtools } from './devtools'

/** How close (px) the cursor can get before the button bolts. */
const RADIUS = 230
/** How long (ms) it stays hidden after each dodge. */
const DELAY = 130

const TAUNTS = [
  'Too slow.',
  'Nope.',
  'Not even close.',
  'Is that all you’ve got?',
  'I can see you.',
  'Try harder.',
  'Almost! (not really)',
  'Missed me.',
  'Wow. Persistent.',
  'Over here!',
  'Still here.',
]
const LABELS = ['Nope', 'Too slow', 'Missed', 'Haha', 'Catch me', 'Try again', 'Whoops']
const NO_KEYBOARD = 'Nice try, but you can’t reach me with the keyboard.'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const stage = $<HTMLElement>('stage')
const taunt = $<HTMLParagraphElement>('taunt')
const dodgesEl = $<HTMLElement>('dodges')
const win = $<HTMLElement>('win')
const notice = $<HTMLElement>('notice')
const spy = $<HTMLElement>('spy')
const fxCanvas = $<HTMLCanvasElement>('fx')
const fx = fxCanvas.getContext('2d')!
const gameCanvas = $<HTMLCanvasElement>('game')
const g = gameCanvas.getContext('2d')!

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

// ---------- State ----------
type Phase = 'idle' | 'vanish' | 'gone' | 'pop'

const btn = { x: 0, y: 0, w: 184, h: 64, label: 'Catch me', phase: 'idle' as Phase, phaseAt: 0, near: 0 }
let dodges = 0
let caught = false
let pointer = { x: -999, y: -999 }
let devtoolsOpen = false
let flashing = false

const hiding = () => btn.phase === 'vanish' || btn.phase === 'gone'
const spying = () => devtoolsOpen || flashing

// ---------- Layout ----------
const FONT = "800 18px Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"

function setLabel(text: string) {
  btn.label = text
  g.font = FONT
  btn.w = 18 + 46 + 12 + g.measureText(text).width + 26
}

function bounds() {
  const hudBottom = document.querySelector('.hud')!.getBoundingClientRect().bottom
  return {
    minX: 16,
    maxX: Math.max(16, window.innerWidth - btn.w - 16),
    minY: hudBottom + 8,
    maxY: Math.max(hudBottom + 8, window.innerHeight - btn.h - 44),
  }
}

/** Distance from a point to the button's rectangle (0 when inside). */
function distanceToButton(x: number, y: number) {
  const dx = Math.max(btn.x - x, 0, x - (btn.x + btn.w))
  const dy = Math.max(btn.y - y, 0, y - (btn.y + btn.h))
  return Math.hypot(dx, dy)
}

function randomSpot() {
  const b = bounds()
  let best = { x: b.minX, y: b.minY, d: -1 }
  for (let i = 0; i < 40; i++) {
    const x = rand(b.minX, b.maxX)
    const y = rand(b.minY, b.maxY)
    const dx = Math.max(x - pointer.x, 0, pointer.x - (x + btn.w))
    const dy = Math.max(y - pointer.y, 0, pointer.y - (y + btn.h))
    const d = Math.hypot(dx, dy)
    if (d > RADIUS * 1.4 + 60) return { x, y }
    if (d > best.d) best = { x, y, d }
  }
  return best
}

function resize() {
  const dpr = window.devicePixelRatio || 1
  for (const c of [gameCanvas, fxCanvas]) {
    c.width = window.innerWidth * dpr
    c.height = window.innerHeight * dpr
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  fx.setTransform(dpr, 0, 0, dpr, 0, 0)
  setLabel(btn.label)
  const b = bounds()
  btn.x = clamp(btn.x, b.minX, b.maxX)
  btn.y = clamp(btn.y, b.minY, b.maxY)
}

// ---------- Drawing the button ----------
function pill(x: number, y: number, w: number, h: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, h / 2)
}

function drawButton(now: number) {
  let opacity = 1
  let scale = 1
  let rot = 0

  if (btn.phase === 'vanish') {
    const t = clamp((now - btn.phaseAt) / 160, 0, 1)
    opacity = 1 - t
    scale = 1 - 0.6 * t
    rot = -0.2 * t
    if (t >= 1) btn.phase = 'gone'
  } else if (btn.phase === 'gone' || spying()) {
    opacity = 0
  } else if (btn.phase === 'pop') {
    const t = clamp((now - btn.phaseAt) / 280, 0, 1)
    scale = 0.4 + 0.6 * easeOutBack(t)
    if (t >= 1) btn.phase = 'idle'
  }
  if (opacity <= 0.01) return

  const near = btn.near
  const shake = near > 0.25 && btn.phase === 'idle' ? Math.sin(now / 18) * near * 3 : 0
  const cx = btn.x + btn.w / 2 + shake
  const cy = btn.y + btn.h / 2 + Math.cos(now / 23) * shake * 0.4

  g.save()
  g.globalAlpha = opacity
  g.translate(cx, cy)
  g.rotate(rot)
  g.scale(scale, scale)

  // Body with a glow that grows as the cursor approaches.
  const grad = g.createLinearGradient(-btn.w / 2, -btn.h / 2, btn.w / 2, btn.h / 2)
  grad.addColorStop(0, '#ff6b6b')
  grad.addColorStop(1, '#ffb347')
  g.shadowColor = `rgba(255, 179, 71, ${0.25 + near * 0.55})`
  g.shadowBlur = 24 + near * 46
  g.shadowOffsetY = 12
  g.fillStyle = grad
  pill(-btn.w / 2, -btn.h / 2, btn.w, btn.h)
  g.fill()
  g.shadowColor = 'transparent'

  // Eyes follow the cursor.
  const ang = Math.atan2(pointer.y - cy, pointer.x - cx)
  const look = Math.min(4.5, Math.hypot(pointer.x - cx, pointer.y - cy) / 40)
  for (const ex of [-btn.w / 2 + 18 + 10, -btn.w / 2 + 18 + 10 + 26]) {
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(ex, 0, 10, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1a1410'
    g.beginPath()
    g.arc(ex + Math.cos(ang) * look, Math.sin(ang) * look, 4.5, 0, Math.PI * 2)
    g.fill()
  }

  // Label.
  g.font = FONT
  g.fillStyle = '#2a1204'
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillText(btn.label, -btn.w / 2 + 18 + 46 + 12, 1)
  g.restore()
}

function frame(now: number) {
  g.clearRect(0, 0, window.innerWidth, window.innerHeight)
  drawButton(now)
  requestAnimationFrame(frame)
}

// ---------- Particles ----------
interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; max: number; size: number
  color: string; rect: boolean; rot: number; vr: number; g: number
}
const particles: Particle[] = []
let fxRaf = 0

function fxLoop() {
  fx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life += 1
    p.vy += p.g
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    const a = 1 - p.life / p.max
    if (a <= 0) {
      particles.splice(i, 1)
      continue
    }
    fx.globalAlpha = a
    fx.fillStyle = p.color
    if (p.rect) {
      fx.save()
      fx.translate(p.x, p.y)
      fx.rotate(p.rot)
      fx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      fx.restore()
    } else {
      fx.beginPath()
      fx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      fx.fill()
    }
  }
  fx.globalAlpha = 1
  fxRaf = particles.length ? requestAnimationFrame(fxLoop) : 0
}
const kick = () => {
  if (!fxRaf) fxRaf = requestAnimationFrame(fxLoop)
}

const PALETTE = ['#ff6b6b', '#ffb347', '#46e3ff', '#ffd166', '#5ef0a5', '#ffffff']

function puff(x: number, y: number) {
  for (let i = 0; i < 18; i++) {
    const a = rand(0, Math.PI * 2)
    const s = rand(1.5, 5)
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.02, life: 0, max: rand(22, 38), size: rand(2, 5), color: pick(PALETTE.slice(0, 3)), rect: false, rot: 0, vr: 0 })
  }
  kick()
}

function confetti() {
  for (let i = 0; i < 220; i++) {
    const fromLeft = i % 2 === 0
    const a = fromLeft ? rand(-1.3, -0.5) : rand(-2.6, -1.8)
    const s = rand(8, 18)
    particles.push({
      x: fromLeft ? 0 : window.innerWidth,
      y: window.innerHeight * 0.85,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      g: 0.28,
      life: 0,
      max: rand(90, 150),
      size: rand(7, 13),
      color: pick(PALETTE),
      rect: true,
      rot: rand(0, 6),
      vr: rand(-0.3, 0.3),
    })
  }
  kick()
}

// ---------- Game ----------
const setTaunt = (text: string) => {
  taunt.textContent = text
}

function dodge() {
  if (hiding() || caught) return
  dodges++
  dodgesEl.textContent = String(dodges)
  puff(btn.x + btn.w / 2, btn.y + btn.h / 2)
  btn.phase = 'vanish'
  btn.phaseAt = performance.now()
  setTaunt(dodges === 1 ? 'Whoa, where did it go?' : pick(TAUNTS))

  window.setTimeout(() => {
    if (caught) return
    setLabel(pick(LABELS))
    const spot = randomSpot()
    btn.x = spot.x
    btn.y = spot.y
    btn.phase = 'pop'
    btn.phaseAt = performance.now()
  }, DELAY + 60)
}

function onPointer(e: PointerEvent) {
  pointer = { x: e.clientX, y: e.clientY }
  if (caught || spying() || hiding()) return
  const d = distanceToButton(e.clientX, e.clientY)
  btn.near = clamp(1 - d / (RADIUS * 2), 0, 1)
  if (d < RADIUS) dodge()
}

let noticeTimer = 0
function showNotice(text: string) {
  notice.textContent = text
  notice.classList.add('show')
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => notice.classList.remove('show'), 2600)
}

function onClick(e: MouseEvent) {
  if (caught || spying() || hiding()) return
  if (distanceToButton(e.clientX, e.clientY) > 0) return
  caught = true
  btn.near = 0
  $('w-dodges').textContent = String(dodges)
  $('win-sub').textContent =
    dodges === 0 ? 'First try. Suspiciously fast.' : 'A lightning-quick click. Respect.'
  win.hidden = false
  confetti()
  $('again').focus()
}

function reset() {
  caught = false
  dodges = 0
  dodgesEl.textContent = '0'
  win.hidden = true
  btn.near = 0
  btn.phase = 'idle'
  setLabel('Catch me')
  setTaunt('Go on. Click the button.')
  const b = bounds()
  btn.x = (b.minX + b.maxX) / 2
  btn.y = (b.minY + b.maxY) / 2
}

// ---------- Dev tools ----------
function renderSpy() {
  spy.hidden = !spying()
  if (spying()) setTaunt('…')
  else if (!caught) {
    // They closed it: the button comes back somewhere new.
    const spot = randomSpot()
    btn.x = spot.x
    btn.y = spot.y
    btn.phase = 'pop'
    btn.phaseAt = performance.now()
    setTaunt('Oh, you’re back.')
  }
}

let flashTimer = 0
function flashSpy() {
  flashing = true
  renderSpy()
  window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    flashing = false
    renderSpy()
  }, 2800)
}

watchDevtools((open) => {
  devtoolsOpen = open
  renderSpy()
})

// ---------- Wire up ----------
document.addEventListener('pointermove', onPointer)
document.addEventListener('pointerdown', onPointer) // touch: dodge before the tap lands
document.addEventListener('pointerleave', () => (btn.near = 0))
gameCanvas.addEventListener('click', onClick)
stage.addEventListener('click', onClick)
$('again').addEventListener('click', reset)
window.addEventListener('resize', resize)
document.addEventListener('contextmenu', (e) => e.preventDefault())

document.addEventListener(
  'keydown',
  (e) => {
    const k = e.key.toLowerCase()
    // The usual ways of opening the inspector. Browsers don't always let a page stop these.
    const inspect =
      k === 'f12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
      (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(k)) ||
      ((e.ctrlKey || e.metaKey) && k === 'u')
    if (inspect) {
      e.preventDefault()
      flashSpy()
      return
    }
    const reaching = ['tab', 'enter', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
    const idle = document.activeElement === document.body || document.activeElement === stage
    if (reaching && idle && !caught && !spying()) showNotice(NO_KEYBOARD)
  },
  true,
)

resize()
reset()
requestAnimationFrame(frame)
