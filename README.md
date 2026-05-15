# ToxicWatch 🎌

> Free anime streaming site powered by AniList & Consumet — built by [xhclinton](https://xhclinton.me)

**Live:** [toxiwatch.xhclinton.me](https://toxiwatch.xhclinton.me)

---

## Features

- Trending, popular & seasonal anime
- Full anime details — synopsis, genres, characters, score
- Episode list & streaming via Consumet
- HLS video player with server switching
- Lightning-fast search with AniList
- Mobile-first responsive design
- Purple-dark aesthetic with particle animations

---

## Stack

- **Backend:** Node.js + Express 4
- **Templates:** EJS
- **Anime Data:** AniList GraphQL API (free, no auth)
- **Episodes & Streaming:** Consumet API
- **Video Player:** HLS.js
- **No database required**

---

## Getting Started

```bash
git clone https://github.com/xhclintohn/Anime-Site
cd Anime-Site
npm install
npm start
```

Open `http://localhost:4000`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `BASE_PATH` | `` | URL prefix (e.g. `/toxicwatch` for reverse proxy) |
| `CONSUMET_API` | `https://consumet-api-topaz.vercel.app` | Consumet API instance URL |

---

## Deploy on Heroku

```bash
heroku create your-app-name
git push heroku main
```

Heroku auto-detects Node.js and runs `npm start` via the Procfile.

---

## APIs Used

- **[AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/)** — Free, no key needed. Provides all anime metadata.
- **[Consumet API](https://github.com/consumet/consumet.ts)** — Open-source, self-hostable. Episodes and streaming sources.

---

## Connect

| Platform | Link |
|----------|------|
| GitHub | [@xhclintohn](https://github.com/xhclintohn) |
| Telegram | [@xhclintonxd](https://t.me/xhclintonxd) |
| WhatsApp | [+254114885159](https://wa.me/254114885159) |
| Channel | [Join WhatsApp Channel](https://whatsapp.com/channel/0029Vb7dL1LHltY3pgCvwR3B) |
| Website | [xhclinton.me](https://xhclinton.me) |

---

## Disclaimer

ToxicWatch is for educational purposes only. All anime content is sourced from third-party streaming providers. We do not host any video files.

---

**Made with ❤️ by [xhclinton](https://xhclinton.me)**
