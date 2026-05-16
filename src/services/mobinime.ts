export interface AnimeItem {
  id: string;
  title: string;
  other_title?: string;
  poster?: string;
  thumbnail?: string;
  imageCover?: string;
  image_cover?: string;
  rating?: string;
  status?: string;
  type?: string;
  year?: string;
  tahun?: string;
  genres?: string[];
  categories?: Array<{ id: string; title: string }>;
  description?: string;
  content?: string;
  displayDescription?: string;
  englishSynopsis?: string;
  malId?: number;
  episodes?: Episode[];
  dubEpisodes?: Episode[];
  totalEpisode?: number;
  totalEpisodes?: number;
  episode?: number;
  source?: 'primary' | 'jikan';
}

export interface Episode {
  id: string;
  number: number;
  title?: string;
  thumbnail?: string;
}

export interface Genre { id: string; title: string; }

export interface ScheduleData { [key: string]: AnimeItem[]; }

export interface HomepageData {
  recommend?: AnimeItem[];
  recommended?: AnimeItem[];
  ongoing?: AnimeItem[];
  schedule?: ScheduleData;
}

export type AnimeType = 'series' | 'movie' | 'ova' | 'live-action';

interface AniListTitle { romaji?: string; english?: string; native?: string; }
interface AniListCoverImage { large?: string; extraLarge?: string; }
interface RawEpisode { id?: string | number; number?: number; title?: string; thumbnail?: string; image?: string; }

interface AniListMedia {
  id?: number;
  title?: AniListTitle;
  coverImage?: AniListCoverImage;
  bannerImage?: string;
  episodes?: number | RawEpisode[];
  dubEpisodes?: Array<{ id: string; number: number }>;
  totalEpisodes?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  format?: string;
  season?: string;
  seasonYear?: number;
  description?: string;
  error?: string;
}

const STATUS_MAP: Record<string, string> = {
  RELEASING: 'Ongoing',
  FINISHED: 'Completed',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function anilistToAnime(m: AniListMedia): AnimeItem {
  const title = m.title?.english || m.title?.romaji || 'Unknown';
  const epsField = m.episodes;
  const totalEpisodes = m.totalEpisodes ||
    (typeof epsField === 'number' ? epsField : undefined) ||
    (Array.isArray(epsField) ? epsField.length : undefined);
  const episodes: Episode[] | undefined = Array.isArray(epsField)
    ? (epsField as RawEpisode[]).map((e, i) => ({
        id: String(e.id ?? ''),
        number: e.number ?? (i + 1),
        title: e.title ?? undefined,
        thumbnail: e.thumbnail ?? e.image ?? undefined,
      }))
    : undefined;

  return {
    id: String(m.id ?? ''),
    title,
    image_cover: m.coverImage?.extraLarge || m.coverImage?.large,
    poster: m.coverImage?.large,
    rating: m.averageScore ? String(m.averageScore / 10) : undefined,
    status: m.status ? (STATUS_MAP[m.status] || m.status) : undefined,
    type: m.format,
    year: m.seasonYear ? String(m.seasonYear) : undefined,
    genres: m.genres,
    totalEpisodes,
    episodes,
    dubEpisodes: Array.isArray(m.dubEpisodes) && m.dubEpisodes.length > 0
      ? m.dubEpisodes.map(e => ({ id: String(e.id), number: e.number }))
      : undefined,
    displayDescription: m.description ? stripHtml(m.description) : undefined,
    source: 'primary',
  };
}

function jikanToAnime(j: Record<string, unknown>): AnimeItem {
  const images = j.images as Record<string, Record<string, string>> | undefined;
  const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url || images?.webp?.image_url || '';
  const genres = Array.isArray(j.genres) ? (j.genres as Array<{ name: string }>).map(g => g.name) : [];
  return {
    id: 'mal-' + String(j.mal_id),
    title: String(j.title_english || j.title || 'Unknown'),
    image_cover: imageUrl,
    rating: j.score ? String(j.score) : undefined,
    status: String(j.status || ''),
    type: String(j.type || ''),
    year: j.year ? String(j.year) : undefined,
    genres,
    totalEpisodes: j.episodes ? Number(j.episodes) : undefined,
    displayDescription: j.synopsis ? String(j.synopsis) : undefined,
    source: 'jikan',
  };
}

class MobinimeService {
  async homepage(): Promise<HomepageData> {
    try {
      const res = await fetch('/api/home');
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json() as { trending?: AniListMedia[]; popular?: AniListMedia[] };
      const recommend = Array.isArray(data.trending) ? data.trending.map(anilistToAnime) : [];
      const ongoing = Array.isArray(data.popular) ? data.popular.map(anilistToAnime) : [];
      if (recommend.length > 0 || ongoing.length > 0) return { recommend, ongoing, schedule: {} };
      throw new Error('Empty response');
    } catch {
      return this.homepageJikan();
    }
  }

  private async homepageJikan(): Promise<HomepageData> {
    const [topData, seasonData] = await Promise.allSettled([
      fetch('/api/jikan/top/anime?filter=airing&limit=24').then(r => r.json()),
      fetch('/api/jikan/seasons/now?limit=24').then(r => r.json()),
    ]);
    const recommend = topData.status === 'fulfilled' && Array.isArray((topData.value as { data?: unknown[] }).data)
      ? ((topData.value as { data: Record<string, unknown>[] }).data).map(jikanToAnime) : [];
    const ongoing = seasonData.status === 'fulfilled' && Array.isArray((seasonData.value as { data?: unknown[] }).data)
      ? ((seasonData.value as { data: Record<string, unknown>[] }).data).map(jikanToAnime) : [];
    return { recommend, ongoing, schedule: {} };
  }

  async animeList(type: AnimeType, options: { page?: string; count?: string; genre?: string } = {}): Promise<AnimeItem[]> {
    const { page = '0', count = '20', genre = '' } = options;
    try {
      const anilistPage = Math.max(1, Number(page) + 1);
      const params = new URLSearchParams({ type, page: String(anilistPage), perPage: count });
      if (genre) params.set('genre', genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      const res = await fetch('/api/list?' + params.toString());
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json() as { results?: AniListMedia[] };
      const list = data.results || [];
      if (list.length > 0) return list.map(anilistToAnime);
      throw new Error('Empty');
    } catch {
      return this.animeListJikan(type, Number(page));
    }
  }

  private async animeListJikan(type: AnimeType, page: number): Promise<AnimeItem[]> {
    const typeMap: Record<AnimeType, string> = { series: 'tv', movie: 'movie', ova: 'ova', 'live-action': 'tv' };
    const res = await fetch('/api/jikan/top/anime?type=' + (typeMap[type] || 'tv') + '&page=' + (page + 1) + '&limit=20');
    const data = await res.json() as { data?: Record<string, unknown>[] };
    return Array.isArray(data.data) ? data.data.map(jikanToAnime) : [];
  }

  async genreList(): Promise<Genre[]> {
    try {
      const res = await fetch('/api/jikan/genres/anime');
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json() as { data?: Array<{ mal_id: number; name: string }> };
      if (Array.isArray(data.data)) {
        return data.data.map(g => ({ id: 'jikan-' + g.mal_id, title: g.name }));
      }
      return [];
    } catch {
      return [];
    }
  }

  async search(query: string, options: { page?: string; count?: string } = {}): Promise<AnimeItem[]> {
    if (!query) throw new Error('Query is required.');
    const { page = '0', count = '24' } = options;
    try {
      const anilistPage = Math.max(1, Number(page) + 1);
      const res = await fetch('/api/search?' + new URLSearchParams({ q: query, page: String(anilistPage), perPage: count }).toString());
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json() as { results?: AniListMedia[] };
      const list = data.results || [];
      if (list.length > 0) return list.map(anilistToAnime);
      throw new Error('Empty');
    } catch {
      const res = await fetch('/api/jikan/anime?' + new URLSearchParams({ q: query, limit: count, page: String(Number(page) + 1) }).toString());
      const data = await res.json() as { data?: Record<string, unknown>[] };
      return Array.isArray(data.data) ? data.data.map(jikanToAnime) : [];
    }
  }

  async detail(id: string): Promise<AnimeItem> {
    if (id.startsWith('mal-')) return this.detailJikan(id.replace('mal-', ''));
    const res = await fetch('/api/detail?id=' + encodeURIComponent(id));
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' })) as { error?: string };
      throw new Error(err.error || 'Anime detail not found.');
    }
    const data = await res.json() as AniListMedia;
    if (data.error) throw new Error(data.error);
    return anilistToAnime(data);
  }

  private async detailJikan(malId: string): Promise<AnimeItem> {
    const res = await fetch('/api/jikan/anime/' + malId + '/full');
    const data = await res.json() as { data?: Record<string, unknown> };
    const full = data.data || {};
    const epRes = await fetch('/api/jikan/anime/' + malId + '/episodes?per_page=100');
    const epData = await epRes.json() as { data?: Array<{ mal_id: number; title?: string }> };
    const episodes: Episode[] = Array.isArray(epData.data)
      ? epData.data.map((e, i) => ({ id: 'ep-' + e.mal_id, number: i + 1, title: e.title }))
      : [];
    const item = jikanToAnime(full);
    item.episodes = episodes;
    return item;
  }

  async stream(id: string, epsid: string, options: { quality?: string } = {}): Promise<string> {
    const { quality = 'HD' } = options;
    if (id.startsWith('mal-')) throw new Error('Direct streaming is not available for this title. Try a different source.');
    if (!epsid) throw new Error('Episode ID is required.');
    const params = new URLSearchParams({ ep: epsid, quality });
    const res = await fetch('/api/stream?' + params.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Stream unavailable' })) as { error?: string };
      throw new Error(err.error || 'Stream URL not found. Try a different episode or quality.');
    }
    const data = await res.json() as { url?: string; error?: string };
    if (data.error) throw new Error(data.error);
    if (!data.url) throw new Error('Stream URL not found. Try a different episode or quality.');
    return data.url;
  }
}

export const mobinime = new MobinimeService();
