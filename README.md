# Catch Me

A tiny browser game: click the button. It won't let you.

**Live demo:** https://nikitha922.github.io/catch-me/

## How it plays

- The button **vanishes in a puff of particles** when your cursor gets close, then reappears somewhere far from you.
- Its **eyes follow your cursor**, it shakes more nervously the closer you get, and it glows as you approach.
- Pick a difficulty. Harder levels dodge from further away and reappear faster. On Easy, Normal and Hard the button eventually gets **tired** and lets you win. On Impossible it never does.
- A timer, dodge counter and per-level best time (saved in `localStorage`) keep score. Catching it triggers confetti.
- On touch screens it dodges as your finger lands, before the tap registers.
- **No keyboard allowed.** The button can't be focused or activated from the keyboard. Pressing Tab, Enter, Space or an arrow key just gets you a "nice try" message.

| Level | Dodge distance | Dodges before it tires |
| --- | --- | --- |
| Easy | 90px | 4 |
| Normal | 130px | 9 |
| Hard | 170px | 16 |
| Impossible | 230px | never |

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
