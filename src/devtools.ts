/**
 * Best-effort "are the browser dev tools open?" detection.
 *
 * Nothing here is bullet-proof (a page can't truly know), so it combines two signals:
 *  1. Console probe: Chrome only reads an object's properties when it renders it in an open console.
 *  2. Window-size gap: docked dev tools make the outer window much bigger than the page viewport.
 *     Skipped on touch devices and once browser zoom changes, because both cause false positives.
 */
export function watchDevtools(onChange: (open: boolean) => void) {
  let open = false
  let probed = false

  const probe = new Image()
  Object.defineProperty(probe, 'id', {
    get() {
      probed = true
      return ''
    },
  })

  const dpr0 = window.devicePixelRatio
  const coarse = window.matchMedia('(pointer: coarse)').matches

  const sizeSaysOpen = () =>
    !coarse &&
    window.devicePixelRatio === dpr0 &&
    (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 260)

  const check = () => {
    probed = false
    console.debug(probe)
    if (probed) console.clear()
    const now = probed || sizeSaysOpen()
    if (now !== open) {
      open = now
      onChange(open)
    }
  }

  window.addEventListener('resize', check)
  window.setInterval(check, 800)
  check()
}
