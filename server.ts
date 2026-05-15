import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';
const GOGO_BASE = 'https://anitaku.to';
const ROOT = process.cwd();
const CLIENT_DIST = path.join(ROOT, 'dist', 'public');

const GOGO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': GOGO_BASE + '/',
};

app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(BASE + '/static', express.static(path.join(ROOT, 'public')));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

interface AniListTitle { romaji?: string; english?: string; native?: string; }
interface AniListCoverImage { large?: string; extraLarge?: string; }
interface AniListMedia {
  id: number;
  title?: AniListTitle;
  coverImage?: AniListCoverImage;
  bannerImage?: string;
  episodes?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  format?: string;
  season?: string;
  seasonYear?: number;
  description?: string;
  duration?: number;
  studios?: { nodes: Array<{ name: string }> };
  characters?: { nodes: Array<{ name: { full: string }; image: { medium: string } }> };
  trailer?: { id: string; site: string };
  nextAiringEpisode?: { episode: number; timeUntilAiring: number };
  relations?: { edges: Array<{ relationType: string; node: { id: number; title: { romaji: string }; coverImage: { large?: string }; format?: string; type?: string } }> };
  recommendations?: { nodes: Array<{ mediaRecommendation: { id: number; title: { romaji: string }; coverImage: { large?: string }; averageScore?: number } }> };
}

interface ConsumetEpisode {
  id: string;
  number: number;
  title?: string;
  image?: string;
}

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface StreamResponse {
  url: string | null;
  sources?: StreamSource[];
  headers?: Record<string, string>;
}

async function anilistQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  let matches = 0;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

async function gogoFetch(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 13000);
  try {
    const r = await fetch(url, {
      headers: GOGO_HEADERS,
      signal: controller.signal as AbortSignal | null,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    return r.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function gogoSearch(query: string): Promise<Array<{ slug: string; title: string }>> {
  const html = await gogoFetch(`${GOGO_BASE}/search.html?keyword=${encodeURIComponent(query)}`);
  if (!html) return [];
  const results: Array<{ slug: string; title: string }> = [];
  const re = /class="name">\s*<a href="\/category\/([^"]+)"[^>]*title="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ slug: m[1], title: m[2] });
  }
  return results;
}

async function gogoShowInfo(slug: string): Promise<{ alias: string; maxEp: number } | null> {
  const html = await gogoFetch(`${GOGO_BASE}/category/${slug}`);
  if (!html) return null;
  const aliasM = html.match(/id="alias_anime"[^>]*value="([^"]+)"/);
  const epEndM = html.match(/id="ep_end"[^>]*value="(\d+)"/);
  if (!aliasM) return null;
  return {
    alias: aliasM[1],
    maxEp: epEndM ? parseInt(epEndM[1]) : 0,
  };
}

async function gogoEmbedUrl(episodeId: string): Promise<string | null> {
  const html = await gogoFetch(`${GOGO_BASE}/${episodeId}`);
  if (!html) return null;
  const m = html.match(/data-video="(https:\/\/[^"]+)"/);
  return m ? m[1] : null;
}

async function findEpisodesGogo(titles: string[], expectedEps?: number): Promise<ConsumetEpisode[]> {
  for (const title of titles) {
    if (!title) continue;
    try {
      const results = await gogoSearch(title);
      if (!results.length) continue;

      const ranked = results
        .map(r => ({ ...r, score: titleSimilarity(r.title, title) }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (!best || best.score < 0.4) continue;

      const info = await gogoShowInfo(best.slug);
      if (!info || info.maxEp === 0) continue;

      if (expectedEps && expectedEps > 50 && info.maxEp < 5) continue;

      const episodes: ConsumetEpisode[] = Array.from({ length: info.maxEp }, (_, i) => ({
        id: `${info.alias}-episode-${i + 1}`,
        number: i + 1,
      }));

      return episodes;
    } catch {
    }
  }
  return [];
}

const Q_TRENDING = `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(type:ANIME,sort:TRENDING_DESC,status_in:[RELEASING,FINISHED]){id title{romaji english}coverImage{large extraLarge}bannerImage episodes status genres averageScore format season seasonYear description(asHtml:false)}}}`;
const Q_POPULAR = `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(type:ANIME,sort:POPULARITY_DESC,status_in:[RELEASING,FINISHED]){id title{romaji english}coverImage{large extraLarge}bannerImage episodes status genres averageScore format season seasonYear}}}`;
const Q_SEASONAL = `query($s:MediaSeason,$y:Int){Page(page:1,perPage:20){media(type:ANIME,season:$s,seasonYear:$y,sort:POPULARITY_DESC){id title{romaji english}coverImage{large extraLarge}episodes status genres averageScore format}}}`;
const Q_SEARCH = `query($q:String,$p:Int,$n:Int){Page(page:$p,perPage:$n){pageInfo{total hasNextPage currentPage lastPage}media(type:ANIME,search:$q,sort:RELEVANCE){id title{romaji english}coverImage{large extraLarge}episodes status genres averageScore format season seasonYear}}}`;
const Q_INFO = `query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native}coverImage{large extraLarge}bannerImage episodes status genres averageScore popularity format season seasonYear description(asHtml:false)duration studios(isMain:true){nodes{name}}characters(sort:ROLE,perPage:12){nodes{name{full}image{medium}}}trailer{id site}nextAiringEpisode{episode timeUntilAiring}relations{edges{relationType node{id title{romaji}coverImage{large}format type}}}recommendations(perPage:8){nodes{mediaRecommendation{id title{romaji}coverImage{large}averageScore}}}}}`;
const Q_LIST = `query($p:Int,$n:Int,$format:MediaFormat,$genre:String,$sort:[MediaSort]){Page(page:$p,perPage:$n){pageInfo{total hasNextPage}media(type:ANIME,format:$format,genre:$genre,sort:$sort,status_in:[RELEASING,FINISHED]){id title{romaji english}coverImage{large extraLarge}episodes status genres averageScore format season seasonYear}}}`;

function getSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'WINTER';
  if (m <= 6) return 'SPRING';
  if (m <= 9) return 'SUMMER';
  return 'FALL';
}

function ctx(req: Request, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { base: BASE, currentPath: req.path, ...extra };
}

app.get(BASE + '/api/home', async (_req: Request, res: Response) => {
  try {
    const year = new Date().getFullYear();
    const season = getSeason();
    const [t, p, s] = await Promise.all([
      anilistQuery<{ Page: { media: AniListMedia[] } }>(Q_TRENDING, { p: 1, n: 20 }),
      anilistQuery<{ Page: { media: AniListMedia[] } }>(Q_POPULAR, { p: 1, n: 20 }),
      anilistQuery<{ Page: { media: AniListMedia[] } }>(Q_SEASONAL, { s: season, y: year }),
    ]);
    res.json({ trending: t.Page.media, popular: p.Page.media, seasonal: s.Page.media, currentSeason: season + ' ' + year });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get(BASE + '/api/search', async (req: Request, res: Response) => {
  try {
    const { q, page = '1', perPage = '24' } = req.query;
    if (!q) return res.json({ results: [], pageInfo: {} });
    const data = await anilistQuery<{ Page: { media: AniListMedia[]; pageInfo: unknown } }>(
      Q_SEARCH, { q, p: Math.max(1, parseInt(String(page))), n: parseInt(String(perPage)) }
    );
    res.json({ results: data.Page.media, pageInfo: data.Page.pageInfo });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get(BASE + '/api/info/:id', async (req: Request, res: Response) => {
  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(Q_INFO, { id: parseInt(req.params.id) });
    res.json(data.Media);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get(BASE + '/api/episodes/:id', async (req: Request, res: Response) => {
  try {
    const animeId = req.params.id;
    const anilistData = await anilistQuery<{ Media: AniListMedia }>(Q_INFO, { id: parseInt(animeId) }).catch(() => null);
    const englishTitle = anilistData?.Media?.title?.english || '';
    const romajiTitle = anilistData?.Media?.title?.romaji || '';
    const expectedEps = anilistData?.Media?.episodes;

    const episodes = await findEpisodesGogo(
      [englishTitle, romajiTitle].filter(Boolean),
      expectedEps
    );

    if (episodes.length > 0) {
      return res.json({ episodes, totalEpisodes: episodes.length });
    }

    res.json({ episodes: [], totalEpisodes: expectedEps || 0 });
  } catch (e: unknown) {
    res.status(502).json({ error: 'Could not load episodes: ' + (e instanceof Error ? e.message : 'Unknown'), episodes: [] });
  }
});

app.get(BASE + '/api/detail', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id param required' });
    const numId = parseInt(String(id));
    if (isNaN(numId)) return res.status(400).json({ error: 'Invalid id' });

    const infoResult = await anilistQuery<{ Media: AniListMedia }>(Q_INFO, { id: numId });
    const media = infoResult.Media;

    const englishTitle = media.title?.english || '';
    const romajiTitle = media.title?.romaji || '';
    const expectedEps = media.episodes;

    const episodes = await findEpisodesGogo(
      [englishTitle, romajiTitle].filter(Boolean),
      expectedEps
    );

    res.json({ ...media, episodes, totalEpisodes: episodes.length || expectedEps || 0 });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get(BASE + '/api/list', async (req: Request, res: Response) => {
  try {
    const { type = 'series', genre, page = '1', perPage = '20' } = req.query;
    const formatMap: Record<string, string> = {
      series: 'TV', movie: 'MOVIE', ova: 'OVA', 'live-action': 'TV',
      tv: 'TV', MOVIE: 'MOVIE', OVA: 'OVA',
    };
    const format = formatMap[String(type)] || 'TV';
    const variables: Record<string, unknown> = {
      p: Math.max(1, parseInt(String(page))),
      n: parseInt(String(perPage)),
      format,
      sort: ['POPULARITY_DESC'],
    };
    if (genre) variables.genre = String(genre);
    const data = await anilistQuery<{ Page: { media: AniListMedia[]; pageInfo: unknown } }>(Q_LIST, variables);
    res.json({ results: data.Page.media, pageInfo: data.Page.pageInfo });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get(BASE + '/api/stream', async (req: Request, res: Response) => {
  try {
    const ep = String(req.query.ep || req.query.episodeId || '');
    if (!ep) return res.status(400).json({ error: 'ep param required' });

    const embedUrl = await gogoEmbedUrl(ep);
    if (embedUrl) {
      const result: StreamResponse = {
        url: embedUrl,
        sources: [{ url: embedUrl, quality: 'HD', isM3U8: false }],
      };
      return res.json(result);
    }

    res.status(502).json({ error: 'Stream unavailable for this episode.', sources: [], url: null });
  } catch (e: unknown) {
    res.status(502).json({ error: 'Could not load stream: ' + (e instanceof Error ? e.message : 'Unknown'), sources: [], url: null });
  }
});

app.get(BASE + '/api/jikan/*', async (req: Request, res: Response) => {
  try {
    const jikanPath = req.path.replace(new RegExp('^' + BASE + '/api/jikan'), '');
    const queryStr = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${JIKAN}${jikanPath}${queryStr ? '?' + queryStr : ''}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('Jikan returned status ' + r.status);
    const data = await r.json();
    res.json(data);
  } catch (e: unknown) {
    res.status(502).json({ error: 'Jikan proxy error: ' + (e instanceof Error ? e.message : 'Unknown') });
  }
});

app.get([BASE + '/', BASE + '/search', BASE + '/anime/*', BASE + '/watch/*', BASE], (req: Request, res: Response) => {
  const spaIndex = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(spaIndex)) {
    res.sendFile(spaIndex);
  } else {
    res.render('index', ctx(req));
  }
});

app.use((_req: Request, res: Response) => {
  const spaIndex = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(spaIndex)) {
    res.sendFile(spaIndex);
  } else {
    res.status(404).render('404', ctx(_req));
  }
});

app.listen(PORT, () => {
  process.stdout.write('ToxiNime running on port ' + PORT + '\n');
});
