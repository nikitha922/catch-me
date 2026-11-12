import './style.css'

type LevelKey = 'easy' | 'normal' | 'hard' | 'impossible'

interface Level {
  key: LevelKey
  label: string
  /** How close (px) the cursor can get before the button bolts. */
  radius: number
  /** Dodges before the button gets tired and lets you win. */
  budget: number
  /** How long (ms) it stays hidden after each dodge. */
  delay: number
}

const LEVELS: Level[] = [
  { key: 'easy', label: 'Easy', radius: 90, budget: 4, delay: 380 },
  { key: 'normal', label: 'Normal', radius: 130, budget: 9, delay: 280 },
  { key: 'hard', label: 'Hard', radius: 170, budget: 16, delay: 200 },
  { key: 'impossible', label: 'Impossible', radius: 230, budget: Infinity, delay: 130 },
]

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
  'Have you tried a keyboard?',
  'Still here.',
]
const LABELS = ['Nope', 'Too slow', 'Missed', 'Haha', 'Catch me', 'Try again', 'Whoops']

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const stage = $<HTMLElement>('stage')
const target = $<HTMLButtonElement>('target')
const labelEl = $<HTMLSpanElement>('label')
const taunt = $<HTMLParagraphElement>('taunt')
const dodgesEl = $<HTMLElement>('dodges')
const timeEl = $<HTMLElement>('time')
const bestEl = $<HTMLElement>('best')
const levelsEl = $<HTMLElement>('levels')
const win = $<HTMLElement>('win')
const canvas = $<HTMLCanvasElement>('fx')
const ctx = canvas.getContext('2d')!
const pupils = [...target.querySelectorAll<HTMLElement>('.eye i')]

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`

// ---------- State ----------
let level = LEVELS[Number(localStorage.getItem('catch-me:level') ?? 1)] ?? LEVELS[1]
let dodges = 0
let hiding = false
let caught = false
let startedAt = 0
let elapsed = 0
let pointer = { x: -999, y: -999 }

const bestKey = () => `catch-me:best:${level.key}`
const readBest = () => {
  const v = Number(localStorage.getItem(bestKey()))
  return v > 0 ? v : null
}

function renderBest() {
  const b = readBest()
  bestEl.textContent = b ? fmt(b) : '–'
}

// ---------- Geometry ----------
function bounds() {
  const hudBottom = document.querySelector('.hud')!.getBoundingClientRect().bottom
  const w = target.offsetWidth
  const h = target.offsetHeight
  return {
    minX: 16,
    maxX: Math.max(16, window.innerWidth - w - 16),
    minY: hudBottom + 8,
    maxY: Math.max(hudBottom + 8, window.innerHeight - h - 44),
    w,
    h,
  }
}

function place(x: number, y: number) {
  target.style.left = `${x}px`
  target.style.top = `${y}px`
}

/** Distance from a point to the button's rectangle (0 when inside). */
function distanceToButton(x: number, y: number) {
  const r = target.getBoundingClientRect()
  const dx = Math.max(r.left - x, 0, x - r.right)
  const dy = Math.max(r.top - y, 0, y - r.bottom)
  return Math.hypot(dx, dy)
}

function randomSpot() {
  const b = bounds()
  let best = { x: b.minX, y: b.minY, d: -1 }
  for (let i = 0; i < 40; i++) {
    const x = rand(b.minX, b.maxX)
    const y = rand(b.minY, b.maxY)
    // Distance from the pointer to where the button *would* be.
    const dx = Math.max(x - pointer.x, 0, pointer.x - (x + b.w))
    const dy = Math.max(y - pointer.y, 0, pointer.y - (y + b.h))
    const d = Math.hypot(dx, dy)
    if (d > level.radius * 1.4 + 60) return { x, y }
    if (d > best.d) best = { x, y, d }
  }
  return best
}

// ---------- Particles ----------
interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; max: number; size: number
  color: string; rect: boolean; rot: number; vr: number; g: number
}
const particles: Particle[] = []
let raf = 0

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function loop() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
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
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    if (p.rect) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  raf = particles.length ? requestAnimationFrame(loop) : 0
}
const kick = () => {
  if (!raf) raf = requestAnimationFrame(loop)
}

const PALETTE = ['#ff7ab6', '#7c5cff', '#46e3ff', '#ffd166', '#5ef0a5', '#ffffff']

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
function setTaunt(text: string) {
  taunt.textContent = text
}

function tired() {
  return dodges >= level.budget
}

function dodge() {
  if (hiding || caught) return
  hiding = true
  dodges++
  dodgesEl.textContent = String(dodges)

  const r = target.getBoundingClientRect()
  puff(r.left + r.width / 2, r.top + r.height / 2)
  target.classList.add('vanish')
  target.classList.remove('nervous')

  setTaunt(
    dodges === 1
      ? 'Whoa, where did it go?'
      : level.key === 'impossible' && dodges >= 25
        ? 'Psst… Tab, then Enter.'
        : pick(TAUNTS),
  )

  window.setTimeout(() => {
    if (caught) return
    const spot = randomSpot()
    place(spot.x, spot.y)
    labelEl.textContent = pick(LABELS)
    if (tired()) {
      target.classList.add('tired')
      labelEl.textContent = 'Fine. You got me.'
      setTaunt('Okay, okay. I’m tired. Go on.')
    }
    target.classList.remove('vanish')
    target.classList.add('pop')
    hiding = false
  }, level.delay)
}

function onPointer(e: PointerEvent) {
  pointer = { x: e.clientX, y: e.clientY }
  if (caught) return

  if (!startedAt) startedAt = performance.now()

  // Eyes follow the cursor.
  const r = target.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const ang = Math.atan2(e.clientY - cy, e.clientX - cx)
  const dist = Math.min(4.5, Math.hypot(e.clientX - cx, e.clientY - cy) / 40)
  for (const p of pupils) p.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`

  if (hiding) return
  const d = distanceToButton(e.clientX, e.clientY)
  const near = clamp(1 - d / (level.radius * 2), 0, 1)
  target.style.setProperty('--near', near.toFixed(2))
  target.classList.toggle('nervous', near > 0.25 && !tired())

  if (!tired() && d < level.radius) dodge()
}

function catchIt(e: MouseEvent) {
  if (caught) return
  caught = true
  elapsed = performance.now() - (startedAt || performance.now())
  const keyboard = e.detail === 0
  target.classList.remove('nervous')

  const prev = readBest()
  const record = !prev || elapsed < prev
  if (record) localStorage.setItem(bestKey(), String(Math.round(elapsed)))
  renderBest()

  $('w-time').textContent = fmt(elapsed)
  $('w-dodges').textContent = String(dodges)
  $('w-level').textContent = level.label
  $('win-sub').textContent = keyboard
    ? 'Keyboard? Sneaky. It never saw that coming.'
    : dodges === 0
      ? 'First try. Suspiciously fast.'
      : tired()
        ? 'It got tired and gave up. Still counts.'
        : 'A lightning-quick click. Respect.'
  if (record) $('win-sub').textContent += ' New best!'
  $('next').hidden = level.key === 'impossible'
  win.hidden = false
  confetti()
  $('again').focus()
}

function reset() {
  caught = false
  hiding = false
  dodges = 0
  startedAt = 0
  elapsed = 0
  dodgesEl.textContent = '0'
  timeEl.textContent = '0.0s'
  win.hidden = true
  target.classList.remove('vanish', 'tired', 'nervous')
  target.style.setProperty('--near', '0')
  labelEl.textContent = 'Catch me'
  setTaunt('Go on. Click the button.')
  const b = bounds()
  place((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
  renderBest()
  target.focus({ preventScroll: true })
  target.blur()
}

function renderLevels() {
  levelsEl.replaceChildren(
    ...LEVELS.map((l) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.role = 'radio'
      b.textContent = l.label
      b.setAttribute('aria-checked', String(l.key === level.key))
      b.addEventListener('click', () => setLevel(l))
      return b
    }),
  )
}

function setLevel(l: Level) {
  level = l
  localStorage.setItem('catch-me:level', String(LEVELS.indexOf(l)))
  renderLevels()
  reset()
}

function tick() {
  if (startedAt && !caught) timeEl.textContent = fmt(performance.now() - startedAt)
  else if (caught) timeEl.textContent = fmt(elapsed)
  requestAnimationFrame(tick)
}

// ---------- Wire up ----------
document.addEventListener('pointermove', onPointer)
document.addEventListener('pointerdown', onPointer) // touch: dodge before the tap lands
target.addEventListener('click', catchIt)
target.addEventListener('animationend', () => target.classList.remove('pop'))
$('again').addEventListener('click', reset)
$('next').addEventListener('click', () => setLevel(LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(level) + 1)]))
window.addEventListener('resize', () => {
  resizeCanvas()
  const b = bounds()
  const r = target.getBoundingClientRect()
  place(clamp(r.left, b.minX, b.maxX), clamp(r.top, b.minY, b.maxY))
})
stage.addEventListener('contextmenu', (e) => e.preventDefault())

resizeCanvas()
renderLevels()
reset()
tick()
