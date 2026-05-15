const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ANILIST = 'https://graphql.anilist.co';
const CONSUMET = (process.env.CONSUMET_API || 'https://consumet-api-topaz.vercel.app').replace(/\/$/, '');

app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(BASE + '/static', express.static(path.join(__dirname, 'public')));

async function anilistQuery(query, variables = {}) {
  const res = await fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    timeout: 15000,
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const Q_TRENDING = `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(type:ANIME,sort:TRENDING_DESC,status_in:[RELEASING,FINISHED]){id title{romaji english}coverImage{large extraLarge}bannerImage episodes status genres averageScore format season seasonYear description(asHtml:false)}}}`;
const Q_POPULAR = `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(type:ANIME,sort:POPULARITY_DESC,status_in:[RELEASING,FINISHED]){id title{romaji english}coverImage{large extraLarge}bannerImage episodes status genres averageScore format season seasonYear}}}`;
const Q_SEASONAL = `query($s:MediaSeason,$y:Int){Page(page:1,perPage:20){media(type:ANIME,season:$s,seasonYear:$y,sort:POPULARITY_DESC){id title{romaji english}coverImage{large extraLarge}episodes status genres averageScore format}}}`;
const Q_SEARCH = `query($q:String,$p:Int){Page(page:$p,perPage:24){pageInfo{total hasNextPage currentPage lastPage}media(type:ANIME,search:$q,sort:RELEVANCE){id title{romaji english}coverImage{large extraLarge}episodes status genres averageScore format season seasonYear}}}`;
const Q_INFO = `query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native}coverImage{large extraLarge}bannerImage episodes status genres averageScore popularity format season seasonYear description(asHtml:false)duration studios(isMain:true){nodes{name}}characters(sort:ROLE,perPage:12){nodes{name{full}image{medium}}}trailer{id site}nextAiringEpisode{episode timeUntilAiring}relations{edges{relationType node{id title{romaji}coverImage{large}format type}}}recommendations(perPage:8){nodes{mediaRecommendation{id title{romaji}coverImage{large}averageScore}}}}}`;

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'WINTER';
  if (m <= 6) return 'SPRING';
  if (m <= 9) return 'SUMMER';
  return 'FALL';
}

function ctx(req, extra = {}) {
  return { base: BASE, currentPath: req.path, ...extra };
}

app.get([BASE + '/', BASE], async (req, res) => {
  res.render('index', ctx(req));
});

app.get(BASE + '/search', (req, res) => {
  res.render('search', ctx(req, { query: req.query.q || '' }));
});

app.get(BASE + '/anime/:id', (req, res) => {
  res.render('anime', ctx(req, { animeId: req.params.id }));
});

app.get(BASE + '/watch/:id/:ep', (req, res) => {
  res.render('watch', ctx(req, { animeId: req.params.id, ep: req.params.ep }));
});

app.get(BASE + '/api/home', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const season = getSeason();
    const [t, p, s] = await Promise.all([
      anilistQuery(Q_TRENDING, { p: 1, n: 20 }),
      anilistQuery(Q_POPULAR, { p: 1, n: 20 }),
      anilistQuery(Q_SEASONAL, { s: season, y: year }),
    ]);
    res.json({
      trending: t.Page.media,
      popular: p.Page.media,
      seasonal: s.Page.media,
      currentSeason: season + ' ' + year,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get(BASE + '/api/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.json({ results: [], pageInfo: {} });
    const data = await anilistQuery(Q_SEARCH, { q, p: parseInt(page) });
    res.json({ results: data.Page.media, pageInfo: data.Page.pageInfo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get(BASE + '/api/info/:id', async (req, res) => {
  try {
    const data = await anilistQuery(Q_INFO, { id: parseInt(req.params.id) });
    res.json(data.Media);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get(BASE + '/api/episodes/:id', async (req, res) => {
  try {
    const r = await fetch(`${CONSUMET}/meta/anilist/info/${req.params.id}`, { timeout: 20000 });
    if (!r.ok) throw new Error('status ' + r.status);
    const data = await r.json();
    res.json({ episodes: data.episodes || [], totalEpisodes: data.totalEpisodes || 0 });
  } catch (e) {
    res.status(502).json({ error: 'Could not load episodes. ' + e.message, episodes: [] });
  }
});

app.get(BASE + '/api/stream', async (req, res) => {
  try {
    const { ep } = req.query;
    if (!ep) return res.status(400).json({ error: 'ep param required' });
    const r = await fetch(`${CONSUMET}/meta/anilist/watch/${encodeURIComponent(ep)}`, { timeout: 20000 });
    if (!r.ok) throw new Error('status ' + r.status);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Could not load stream. ' + e.message, sources: [] });
  }
});

app.use((req, res) => {
  res.status(404).render('404', ctx(req));
});

app.listen(PORT, () => {
  console.log('ToxicWatch running on port ' + PORT);
});
