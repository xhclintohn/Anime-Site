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
const ROOT = process.cwd();
const CLIENT_DIST = path.join(ROOT, 'dist', 'public');

const CONSUMET_INSTANCES = [
  (process.env.CONSUMET_API || 'https://consumet-api-topaz.vercel.app').replace(/\/$/, ''),
  'https://consumet-api.vercel.app',
  'https://api.consumet.org',
].filter((v, i, a) => a.indexOf(v) === i);

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
  description?: string;
}

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface ConsumetStreamResponse {
  sources?: StreamSource[];
  headers?: Record<string, string>;
  download?: string;
}

interface ConsumetInfoResponse {
  episodes?: ConsumetEpisode[];
  totalEpisodes?: number;
  id?: string;
  title?: string;
}

interface GogoanimeSearchResult {
  id: string;
  title: string;
  url?: string;
  image?: string;
  releaseDate?: string;
  subOrDub?: string;
}

interface GogoanimeSearchResponse {
  results?: GogoanimeSearchResult[];
  currentPage?: number;
}

interface GogoanimeEpisode {
  id: string;
  number: number;
  url?: string;
}

interface GogoanimeInfoResponse {
  id?: string;
  title?: string;
  episodes?: GogoanimeEpisode[];
  totalEpisodes?: number;
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

async function consumetFetch<T>(path: string): Promise<T | null> {
  for (const base of CONSUMET_INSTANCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const r = await fetch(`${base}${path}`, { signal: controller.signal as AbortSignal | null });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json() as T;
        return data;
      }
    } catch {
    }
  }
  return null;
}

async function consumetStream(path: string): Promise<ConsumetStreamResponse | null> {
  for (const base of CONSUMET_INSTANCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const r = await fetch(`${base}${path}`, { signal: controller.signal as AbortSignal | null });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json() as ConsumetStreamResponse;
        if (data.sources && data.sources.length > 0) return data;
      }
    } catch {
    }
  }
  return null;
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
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

async function findGogoanimeEpisodes(titles: string[], expectedEps?: number): Promise<ConsumetEpisode[]> {
  for (const title of titles) {
    if (!title) continue;
    const slug = titleToSlug(title);
    if (!slug) continue;
    try {
      const searchData = await consumetFetch<GogoanimeSearchResponse>(`/anime/gogoanime/${encodeURIComponent(slug)}`);
      const results = searchData?.results || [];
      if (!results.length) continue;

      const ranked = results
        .map(r => ({ ...r, score: titleSimilarity(r.title || '', title) }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (!best || best.score < 0.45) continue;

      const infoData = await consumetFetch<GogoanimeInfoResponse>(`/anime/gogoanime/info/${encodeURIComponent(best.id)}`);
      const rawEps = infoData?.episodes || [];
      if (!rawEps.length) continue;

      const episodes: ConsumetEpisode[] = rawEps.map(e => ({
        id: e.id,
        number: e.number,
        title: undefined,
        image: undefined,
      }));

      if (expectedEps && expectedEps > 100 && episodes.length < 20) continue;

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
    const infoData = await consumetFetch<ConsumetInfoResponse>(`/meta/anilist/info/${animeId}`);
    if (infoData && infoData.episodes && infoData.episodes.length > 0) {
      return res.json({ episodes: infoData.episodes, totalEpisodes: infoData.totalEpisodes || infoData.episodes.length });
    }

    const anilistData = await anilistQuery<{ Media: AniListMedia }>(Q_INFO, { id: parseInt(animeId) }).catch(() => null);
    const englishTitle = anilistData?.Media?.title?.english || '';
    const romajiTitle = anilistData?.Media?.title?.romaji || '';
    const expectedEps = anilistData?.Media?.episodes;

    const episodes = await findGogoanimeEpisodes(
      [englishTitle, romajiTitle].filter(Boolean),
      expectedEps
    );

    if (episodes.length > 0) {
      return res.json({ episodes, totalEpisodes: episodes.length });
    }

    res.json({ episodes: [], totalEpisodes: 0 });
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

    const consumetData = await consumetFetch<ConsumetInfoResponse>(`/meta/anilist/info/${numId}`);
    let episodes: ConsumetEpisode[] = consumetData?.episodes || [];
    let totalEpisodes = consumetData?.totalEpisodes || episodes.length;

    if (!episodes.length) {
      const fallbackEps = await findGogoanimeEpisodes(
        [englishTitle, romajiTitle].filter(Boolean),
        expectedEps
      );
      if (fallbackEps.length > 0) {
        episodes = fallbackEps;
        totalEpisodes = fallbackEps.length;
      }
    }

    res.json({ ...media, episodes, totalEpisodes });
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
    if (!ep) return res.status(400).json({ error: 'ep or episodeId param required' });

    const quality = String(req.query.quality || 'HD').toLowerCase();

    let data: ConsumetStreamResponse | null = null;

    data = await consumetStream(`/meta/anilist/watch/${encodeURIComponent(ep)}`);

    if (!data || !data.sources?.length) {
      data = await consumetStream(`/anime/gogoanime/watch/${encodeURIComponent(ep)}`);
    }

    if (!data || !data.sources?.length) {
      const epDub = ep.replace(/-episode-/, '-dub-episode-');
      if (epDub !== ep) {
        data = await consumetStream(`/anime/gogoanime/watch/${encodeURIComponent(epDub)}`);
      }
    }

    if (!data || !data.sources?.length) {
      return res.status(502).json({ error: 'Stream unavailable for this episode. Try a different episode or quality.', sources: [] });
    }

    const sources: StreamSource[] = data.sources || [];
    const preferred =
      sources.find(s => s.quality.toLowerCase().includes(quality)) ||
      sources.find(s => s.isM3U8) ||
      sources[0];

    res.json({ ...data, url: preferred?.url || null });
  } catch (e: unknown) {
    res.status(502).json({ error: 'Could not load stream: ' + (e instanceof Error ? e.message : 'Unknown'), sources: [] });
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
  process.stdout.write('ToxicWatch running on port ' + PORT + '\n');
});
