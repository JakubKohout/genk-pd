# genk-pd

Educational web app for the Police Department on the `genk.cz` server. Trains
10-codes (10-X dispatch codes) in two modes: typing the code from its meaning,
and picking the meaning from multiple choices.

Pure-frontend SPA — no backend. All progress is stored in the browser's
`localStorage`.

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP-themed palette)
- React Router 6
- Vitest 2 (unit/component) + Playwright 1 (E2E)

## Quick start

```bash
npm install
npm run dev          # dev server on :5173
npm run build        # production build
npm run preview      # serve built dist on :4173
npm test             # unit + component tests
npm run test:e2e     # Playwright tests (boots its own dev server)
npm run test:all     # everything
```

## Modules

- **Codes** (`src/modules/codes`) — implemented. Two practice modes, per-code
  score tracking, and an importance filter.
- **Laws** (`/laws`) — placeholder. Will cover the Penal Code, LEA, and the
  Firearm Act.
- **SASP** (`/sasp`) — placeholder for the SASP handbook module.

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes, the data model,
algorithms, and gotchas.

## License

MIT — see [LICENSE.md](./LICENSE.md).
