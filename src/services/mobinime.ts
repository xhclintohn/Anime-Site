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

  const ANIME_TYPES: Record<AnimeType, string> = {
    series: '1', movie: '3', ova: '2', 'live-action': '4',
  };

  const STATUS_MAP: Record<string, string> = {
    '1': 'Ongoing', '2': 'Completed', '3': 'Upcoming',
  };

  function decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function normalizeEpisode(item: Record<string, unknown>, idx: number): Episode {
    return {
      id: String(item.id || ''),
      number: item.number ? Number(item.number) : (item.episode ? Number(item.episode) : idx + 1),
      title: item.title ? String(item.title) : undefined,
      thumbnail: item.thumbnail as string | undefined,
    };
  }

  function normalize(item: Record<string, unknown>): AnimeItem {
    const status = String(item.status || '');
    const rawEps = Array.isArray(item.episodes) ? item.episodes as Record<string, unknown>[] : undefined;
    return {
      id: String(item.id || ''),
      title: String(item.title || item.name || 'Unknown'),
      other_title: item.other_title ? String(item.other_title) : undefined,
      image_cover: item.image_cover as string | undefined,
      imageCover: item.imageCover as string | undefined,
      poster: item.poster as string | undefined,
      thumbnail: item.thumbnail as string | undefined,
      rating: item.rating ? String(item.rating) : undefined,
      status: STATUS_MAP[status] || status || undefined,
      type: item.type as string | undefined,
      year: (item.year || item.tahun) ? String(item.year || item.tahun) : undefined,
      tahun: item.tahun ? String(item.tahun) : undefined,
      genres: Array.isArray(item.genres) ? item.genres as string[] : undefined,
      categories: item.categories as AnimeItem['categories'],
      description: item.description as string | undefined,
      content: item.content as string | undefined,
      displayDescription: (item.displayDescription || item.englishSynopsis || item.content || item.description) as string | undefined,
      englishSynopsis: item.englishSynopsis as string | undefined,
      malId: item.malId ? Number(item.malId) : undefined,
      episodes: rawEps ? rawEps.map(normalizeEpisode) : undefined,
      totalEpisode: item.totalEpisode ? Number(item.totalEpisode) : (item.total_episode ? Number(item.total_episode) : undefined),
      totalEpisodes: item.totalEpisodes ? Number(item.totalEpisodes) : undefined,
      episode: item.episode ? Number(item.episode) : undefined,
    };
  }

  function jikanToAnime(j: Record<string, unknown>): AnimeItem {
    const images = j.images as Record<string, Record<string, string>> | undefined;
    const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url || images?.webp?.image_url || '';
    const genres = Array.isArray(j.genres) ? (j.genres as Array<{name: string}>).map(g => g.name) : [];
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

  async function proxyPost(endpoint: string, body: Record<string, unknown> = {}) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'POST', body }),
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function proxyGet(endpoint: string) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function jikanGet(path: string): Promise<Record<string, unknown>> {
    const res = await fetch('/api/jikan' + path);
    if (!res.ok) throw new Error('Jikan error: ' + res.status);
    return res.json();
  }

  class MobinimeService {
    async homepage(): Promise<HomepageData> {
      try {
        const data = await proxyGet('/pages/homepage');
        const recommend = Array.isArray(data.recommend) ? (data.recommend as Record<string, unknown>[]).map(normalize) : [];
        const ongoing = Array.isArray(data.ongoing) ? (data.ongoing as Record<string, unknown>[]).map(normalize) : [];
        const scheduleRaw = data.schedule && typeof data.schedule === 'object' ? data.schedule as Record<string, unknown[]> : {};
        const schedule: ScheduleData = {};
        for (const [k, v] of Object.entries(scheduleRaw)) {
          schedule[k] = Array.isArray(v) ? (v as Record<string, unknown>[]).map(normalize) : [];
        }
        if (recommend.length > 0 || ongoing.length > 0) return { recommend, ongoing, schedule };
        throw new Error('Empty primary data');
      } catch {
        return this.homepageJikan();
      }
    }

    private async homepageJikan(): Promise<HomepageData> {
      const [topData, seasonData] = await Promise.allSettled([
        jikanGet('/top/anime?filter=airing&limit=24'),
        jikanGet('/seasons/now?limit=24'),
      ]);
      const recommend = topData.status === 'fulfilled' && Array.isArray(topData.value.data)
        ? (topData.value.data as Record<string, unknown>[]).map(jikanToAnime) : [];
      const ongoing = seasonData.status === 'fulfilled' && Array.isArray(seasonData.value.data)
        ? (seasonData.value.data as Record<string, unknown>[]).map(jikanToAnime) : [];
      return { recommend, ongoing, schedule: {} };
    }

    async animeList(type: AnimeType, options: { page?: string; count?: string; genre?: string } = {}): Promise<AnimeItem[]> {
      const { page = '0', count = '15', genre = '' } = options;
      try {
        if (!ANIME_TYPES[type]) throw new Error('Invalid type');
        let gnr = '';
        if (genre) {
          const genres = await this.genreList();
          const found = genres.find(g => g.title.toLowerCase().replace(/\s+/g, '-') === genre.toLowerCase());
          gnr = found?.id || '';
        }
        const data = await proxyPost('/anime/list', {
          perpage: count, startpage: page, userid: '', sort: '', genre: gnr, jenisanime: ANIME_TYPES[type],
        });
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (list.length > 0) return (list as Record<string, unknown>[]).map(normalize);
        throw new Error('Empty');
      } catch {
        return this.animeListJikan(type, Number(page));
      }
    }

    private async animeListJikan(type: AnimeType, page: number): Promise<AnimeItem[]> {
      const typeMap: Record<AnimeType, string> = { series: 'tv', movie: 'movie', ova: 'ova', 'live-action': 'tv' };
      const data = await jikanGet('/top/anime?type=' + (typeMap[type] || 'tv') + '&page=' + (page + 1) + '&limit=15');
      return Array.isArray(data.data) ? (data.data as Record<string, unknown>[]).map(jikanToAnime) : [];
    }

    async genreList(): Promise<Genre[]> {
      try {
        const data = await proxyGet('/anime/genre-list');
        return Array.isArray(data) ? data as Genre[] : [];
      } catch {
        const data = await jikanGet('/genres/anime');
        if (Array.isArray(data.data)) {
          return (data.data as Array<{mal_id: number; name: string}>).map(g => ({ id: 'jikan-' + g.mal_id, title: g.name }));
        }
        return [];
      }
    }

    async search(query: string, options: { page?: string; count?: string } = {}): Promise<AnimeItem[]> {
      const { page = '0', count = '25' } = options;
      if (!query) throw new Error('Query is required.');
      try {
        const data = await proxyPost('/anime/search', { perpage: count, startpage: page, q: query });
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) return (list as Record<string, unknown>[]).map(normalize);
        throw new Error('Empty');
      } catch {
        const data = await jikanGet('/anime?q=' + encodeURIComponent(query) + '&limit=' + count + '&page=' + (Number(page) + 1));
        return Array.isArray(data.data) ? (data.data as Record<string, unknown>[]).map(jikanToAnime) : [];
      }
    }

    async detail(id: string): Promise<AnimeItem> {
      if (id.startsWith('mal-')) return this.detailJikan(id.replace('mal-', ''));
      // Use the enhanced detail endpoint that fetches English description in parallel
      const res = await fetch('/api/detail?id=' + encodeURIComponent(id));
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Anime detail not found.');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return normalize(data as Record<string, unknown>);
    }

    private async detailJikan(malId: string): Promise<AnimeItem> {
      const data = await jikanGet('/anime/' + malId + '/full');
      const full = data.data as Record<string, unknown>;
      const epData = await jikanGet('/anime/' + malId + '/episodes?per_page=100');
      const episodes: Episode[] = Array.isArray(epData.data)
        ? (epData.data as Array<{mal_id: number; title?: string}>).map((e, i) => ({
            id: 'ep-' + e.mal_id, number: i + 1, title: e.title,
          }))
        : [];
      const item = jikanToAnime(full);
      item.episodes = episodes;
      return item;
    }

    // New: uses combined /api/stream endpoint — only ONE round trip to get the URL
    async stream(id: string, epsid: string, options: { quality?: string } = {}): Promise<string> {
      const { quality = 'HD' } = options;
      if (id.startsWith('mal-')) throw new Error('Direct streaming is not available for this title. Try a different source.');
      if (!id || !epsid) throw new Error('Anime ID and episode ID are required.');

      const url = '/api/stream?animeId=' + encodeURIComponent(id) + '&episodeId=' + encodeURIComponent(epsid) + '&quality=' + quality;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Stream unavailable' }));
        throw new Error(err.error || 'Stream URL not found. Try a different episode or quality.');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.url) throw new Error('Stream URL not found. Try a different episode or quality.');
      return decodeHtmlEntities(String(data.url));
    }
  }

  export const mobinime = new MobinimeService();
  