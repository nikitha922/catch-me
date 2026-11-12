# Catch Me

A tiny browser game: click the button. It won't let you.

**Live demo:** https://nikitha922.github.io/catch-me/

## How it plays

- The button **vanishes in a puff of particles** when your cursor gets close, then reappears somewhere far from you.
- Its **eyes follow your cursor**, it shakes more nervously the closer you get, and it glows as you approach.
- There is one difficulty: **Impossible**. It dodges from 230px away and is back within 130ms, so a pointer essentially never gets there.
- A dodge counter keeps score. In the unlikely event you catch it, there's confetti.
- On touch screens it dodges as your finger lands, before the tap registers.
- **No keyboard allowed.** The button can't be focused or activated from the keyboard. Pressing Tab, Enter, Space or an arrow key just gets you a "nice try" message.

## Tech stack

| Area | Choice |
| --- | --- |
| Language | TypeScript (no framework) |
| Build tool | Vite |
| Effects | Canvas 2D particles (puffs and confetti) |
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
