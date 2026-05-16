# ToxiNime 🎌

> Free anime streaming — no sign-up, no ads, just anime.

**Live:** [toxiwatch.xhclinton.me](https://toxiwatch.xhclinton.me)
**Source:** [github.com/xhclintohn/Anime-Site](https://github.com/xhclintohn/Anime-Site)

---

## Features

- Streaming via anitaku.to embed player (vibeplayer.site) — no popup ads
- Search across 10,000+ titles powered by AniList
- SUB / DUB toggle — auto-detected when a dub version exists on anitaku.to
- Watch history — resume exactly where you left off
- Anime schedule — see what is airing each day of the week
- Keyboard shortcuts — `←` / `→` to skip episodes, `Ctrl+K` to search
- AOS scroll animations throughout the UI
- Wave loading animation when opening an anime
- Fully responsive — mobile-first design

---

## Stack

- React 18 + TypeScript + Vite
- Express 5 API server (scrapes anitaku.to for streams)
- AniList GraphQL API (metadata, search, schedule)
- Tailwind CSS + custom animation system (AOS, wave loader, skeleton)

---

## Running locally

```bash
npm install
npm run server   # Express API on :4000
npm run dev      # Vite dev server
```

---

## How streaming works

1. User searches → AniList returns title metadata (poster, rating, genres)
2. Server searches anitaku.to for the title and scrapes episode list
3. Episode alias extracted from `href="/slug-episode-1"` pattern
4. Max episode count extracted from `data-value` range tab attributes
5. Embed URL extracted from `data-video` attribute on each episode page
6. vibeplayer.site embed rendered in a sandboxed iframe (no allow-popups = no ads)
7. Dub version auto-detected by checking `{slug}-dub` on anitaku.to in parallel

---

## Architecture

```
AniList GraphQL  →  metadata, search, schedule, genres
anitaku.to       →  episode list + stream embed URLs
vibeplayer.site  →  video embed (no X-Frame-Options restriction)
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `BASE_PATH` | `` | URL prefix for reverse proxy |

---

## Connect

| Platform | Link |
|----------|------|
| GitHub | [@xhclintohn](https://github.com/xhclintohn) |
| Telegram | [@xhclintonxd](https://t.me/xhclintonxd) |
| WhatsApp | [+254114885159](https://wa.me/254114885159) |
| Website | [xhclinton.me](https://xhclinton.me) |

---

**Made with love by [xhclinton](https://xhclinton.me)**
