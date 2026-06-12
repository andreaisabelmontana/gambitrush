# Knightmare

A fast survival arcade game on a **6×6 board**. Chess-piece hazards telegraph the squares they're about to strike — dodge off them in time or the run ends. Survive a wave and the board only gets faster and busier. How many waves can you outlast?

**▶ Play:** https://andreaisabelmontana.github.io/knightmare/

## The hazards

- **Rook** — sweeps an entire row or column
- **Bishop** — strikes along a diagonal
- **Knight** — lands on an L-jump square

Each wave first **warns** (the doomed squares pulse orange), then **strikes** (they flash red). If you're standing on a warned square when the strike lands, you're out. The warning window shrinks and more hazards stack on as your wave count climbs.

## Features

- Escalating difficulty — shorter telegraphs and up to four simultaneous hazards
- A guarantee that the board is never *fully* lethal, so there's always an escape
- Local **leaderboard** of your top five runs (`localStorage`)
- Keyboard, swipe, and on-screen D-pad controls; procedural WebAudio blips

## Tech

Vanilla JS + Canvas 2D. No build step, no dependencies.

```
index.html
styles.css
src/game.js   # board, hazard generation, wave timing, input, render, leaderboard
```

## License

MIT — see [LICENSE](LICENSE).
