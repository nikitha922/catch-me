# Catch Me

A tiny browser game: click the button. It won't let you.

**Live demo:** https://nikitha922.github.io/catch-me/

## How it plays

- The button **vanishes in a puff of particles** when your cursor gets close, then reappears somewhere far from you.
- Its **eyes follow your cursor**, it shakes more nervously the closer you get, and it glows as you approach.
- There is one difficulty: **Impossible**. It dodges from 230px away and is back within 130ms, so a pointer essentially never gets there.
- A dodge counter keeps score. In the unlikely event you catch it, there's confetti.
- On touch screens it dodges as your finger lands, before the tap registers.
- **It knows when you open the dev tools.** The button hides and a sticker appears: "I see what you're doing...". Close the tools and it comes back. Detection is best-effort (see below).
- **No keyboard allowed.** The button can't be focused or activated from the keyboard. Pressing Tab, Enter, Space or an arrow key just gets you a "nice try" message.

## Dev-tools detection and the canvas button

The button isn't a DOM element. It's drawn on a `<canvas>` and hit-tested by hand, so Inspect Element shows a plain canvas with nothing to select or click. The right-click menu is disabled, and the usual inspector shortcuts (`F12`, `Cmd/Ctrl+Shift+I/J/C`, `Cmd+Opt+I/J/C`, `Ctrl/Cmd+U`) are intercepted where the browser allows it.

Detecting open dev tools (`src/devtools.ts`) combines two signals: a console probe that Chrome only evaluates while a console is open, and a window-size check for docked tools. Neither is foolproof. A page can't truly know, browsers can still open the tools, and the source is always viewable, so treat this as a joke and not as security. The size check is skipped on touch devices and after browser zoom changes to avoid false alarms.

## Tech stack

| Area | Choice |
| --- | --- |
| Language | TypeScript (no framework) |
| Build tool | Vite |
| Rendering | Canvas 2D (the button, puffs and confetti) |
| Styling | Plain CSS with coral and amber gradients and CSS animations |
| Hosting | GitHub Pages (via `gh-pages`) |

## Getting started

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Build and publish `dist/` to the `gh-pages` branch |

If a deploy fails with `a branch named 'gh-pages' already exists`, run `npx gh-pages-clean` first.
