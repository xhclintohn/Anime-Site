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

  export interface Genre {
    id: string;
    title: string;
  }

  export interface ScheduleData {
    [key: string]: AnimeItem[];
  }

  export interface HomepageData {
    recommend?: AnimeItem[];
    recommended?: AnimeItem[];
    ongoing?: AnimeItem[];
    schedule?: ScheduleData;
    latest?: AnimeItem[];
    popular?: AnimeItem[];
  }

  export type AnimeType = 'series' | 'movie' | 'ova' | 'live-action';

  const ANIME_TYPES: Record<AnimeType, string> = {
    series: '1',
    movie: '3',
    ova: '2',
    'live-action': '4',
  };

  const STATUS_MAP: Record<string, string> = {
    '1': 'Ongoing',
    '2': 'Completed',
    '3': 'Upcoming',
  };

  function normalize(item: Record<string, unknown>): AnimeItem {
    const status = String(item.status || '');
    return {
      id: String(item.id || ''),
      title: String(item.title || 'Unknown'),
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
      episodes: item.episodes as Episode[] | undefined,
      totalEpisode: item.totalEpisode ? Number(item.totalEpisode) : undefined,
      totalEpisodes: item.totalEpisodes ? Number(item.totalEpisodes) : undefined,
      episode: item.episode ? Number(item.episode) : undefined,
    };
  }

  function jikanToAnime(j: Record<string, unknown>): AnimeItem {
    const images = j.images as Record<string, Record<string, string>> | undefined;
    const imageUrl = images?.jpg?.image_url || images?.webp?.image_url || '';
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
      source: 'jikan',
    };
  }

  async function proxyRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method, body }),
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function jikanRequest(path: string): Promise<Record<string, unknown>> {
    const res = await fetch('/api/jikan' + path);
    if (!res.ok) throw new Error('Jikan error: ' + res.status);
    return res.json();
  }

  class MobinimeService {
    async homepage(): Promise<HomepageData> {
      try {
        const data = await proxyRequest('/pages/homepage', 'GET');
        const recommend = Array.isArray(data.recommend) ? (data.recommend as Record<string, unknown>[]).map(normalize) : [];
        const ongoing = Array.isArray(data.ongoing) ? (data.ongoing as Record<string, unknown>[]).map(normalize) : [];
        const scheduleRaw = data.schedule && typeof data.schedule === 'object' ? data.schedule as Record<string, unknown[]> : {};
        const schedule: ScheduleData = {};
        for (const [k, v] of Object.entries(scheduleRaw)) {
          schedule[k] = Array.isArray(v) ? (v as Record<string, unknown>[]).map(normalize) : [];
        }
        if (recommend.length > 0 || ongoing.length > 0) {
          return { recommend, ongoing, schedule };
        }
        throw new Error('Empty primary data');
      } catch {
        return this.homepageJikan();
      }
    }

    private async homepageJikan(): Promise<HomepageData> {
      const [topData, seasonData] = await Promise.allSettled([
        jikanRequest('/top/anime?filter=airing&limit=24'),
        jikanRequest('/seasons/now?limit=24'),
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
          const found = genres.find(g => g.title.toLowerCase().replace(/s+/g, '-') === genre.toLowerCase());
          gnr = found?.id || '';
        }
        const data = await proxyRequest('/anime/list', 'POST', {
          perpage: count, startpage: page, userid: '', sort: '', genre: gnr, jenisanime: ANIME_TYPES[type],
        });
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (list.length > 0) return (list as Record<string, unknown>[]).map(normalize);
        throw new Error('Empty list');
      } catch {
        return this.animeListJikan(type, Number(page));
      }
    }

    private async animeListJikan(type: AnimeType, page: number): Promise<AnimeItem[]> {
      const typeMap: Record<AnimeType, string> = { series: 'tv', movie: 'movie', ova: 'ova', 'live-action': 'tv' };
      const jType = typeMap[type] || 'tv';
      const p = page + 1;
      const data = await jikanRequest('/top/anime?type=' + jType + '&page=' + p + '&limit=15');
      return Array.isArray(data.data) ? (data.data as Record<string, unknown>[]).map(jikanToAnime) : [];
    }

    async genreList(): Promise<Genre[]> {
      try {
        const data = await proxyRequest('/anime/genre-list', 'GET');
        return Array.isArray(data) ? data as Genre[] : [];
      } catch {
        const data = await jikanRequest('/genres/anime');
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
        const data = await proxyRequest('/anime/search', 'POST', { perpage: count, startpage: page, q: query });
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) return (list as Record<string, unknown>[]).map(normalize);
        throw new Error('Empty');
      } catch {
        const data = await jikanRequest('/anime?q=' + encodeURIComponent(query) + '&limit=' + count + '&page=' + (Number(page) + 1));
        return Array.isArray(data.data) ? (data.data as Record<string, unknown>[]).map(jikanToAnime) : [];
      }
    }

    async detail(id: string): Promise<AnimeItem> {
      if (id.startsWith('mal-')) {
        const malId = id.replace('mal-', '');
        return this.detailJikan(malId);
      }
      const data = await proxyRequest('/anime/detail', 'POST', { id });
      if (!data?.id && !data?.title) throw new Error('Anime detail not found.');
      return normalize(data as Record<string, unknown>);
    }

    private async detailJikan(malId: string): Promise<AnimeItem> {
      const data = await jikanRequest('/anime/' + malId + '/full');
      const full = data.data as Record<string, unknown>;
      const epData = await jikanRequest('/anime/' + malId + '/episodes?per_page=100');
      const episodes: Episode[] = Array.isArray(epData.data)
        ? (epData.data as Array<{mal_id: number; title?: string}>).map((e, i) => ({
            id: 'ep-' + e.mal_id,
            number: i + 1,
            title: e.title,
          }))
        : [];
      const item = jikanToAnime(full);
      item.episodes = episodes;
      item.content = full.synopsis ? String(full.synopsis) : undefined;
      return item;
    }

    async stream(id: string, epsid: string, options: { quality?: string } = {}): Promise<string> {
      const { quality = 'HD' } = options;
      if (id.startsWith('mal-')) throw new Error('Streaming not available for this anime via primary source.');
      if (!id || !epsid) throw new Error('Anime id & episode id is required.');
      const srv = await proxyRequest('/anime/get-server-list', 'POST', {
        id: epsid, animeId: id, jenisAnime: '1', userId: '',
      });
      if (!srv?.serverurl) throw new Error('No server available for this episode.');
      const data = await proxyRequest('/anime/get-url-video', 'POST', {
        url: srv.serverurl, quality, position: '0',
      });
      if (!data?.url) throw new Error('Stream URL not found. Try a different quality or episode.');
      return data.url;
    }
  }

  export const mobinime = new MobinimeService();
  