# 🏠 Henry & Lauri — Household Budget

A clean, offline-first household budget tracker with proportional income splitting and planned vs actual tracking.

## Features

- **Planned vs Actual** — enter what you expect to spend and what you actually spend; differences are highlighted
- **Proportional splitting** — contributions are calculated by income ratio, not 50/50
- **Monthly tracking** — create a new month each cycle, all history is preserved
- **Custom categories** — add/remove expense categories with emoji icons
- **Offline-first** — all data is stored in your browser (localStorage), no account needed

## Usage

Just open `index.html` in any browser. No build step, no dependencies, no server needed.

```
open index.html
```

## Structure

```
household-budget/
├── index.html       # App shell
└── src/
    ├── style.css    # All styles (supports dark mode)
    └── app.js       # App logic + localStorage persistence
```

## Roadmap

- [ ] Export to CSV / Excel
- [ ] Charts — spending by category over months
- [ ] Recurring expenses — auto-fill from previous month
- [ ] Notes per category
- [ ] PWA support (install as app on phone)
