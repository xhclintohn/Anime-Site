import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Star, Clock, Calendar, ChevronLeft, History, ChevronRight, Info, Tv } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { GenreBadge } from '@/components/GenreBadge';
import { EmptyState } from '@/components/EmptyState';
import { AnimeCard } from '@/components/AnimeCard';
import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { cn } from '@/lib/utils';

const EP_PAGE_SIZE = 50;

function EpisodeGrid({ episodes, animeId, lastEpisodeId }: { episodes: Episode[]; animeId: string; lastEpisodeId?: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(episodes.length / EP_PAGE_SIZE);
  const visible = episodes.slice(page * EP_PAGE_SIZE, (page + 1) * EP_PAGE_SIZE);

  return (
    <div>
      {totalPages > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            const start = i * EP_PAGE_SIZE + 1;
            const end = Math.min((i + 1) * EP_PAGE_SIZE, episodes.length);
            return (
              <button key={i} onClick={() => setPage(i)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all"
                style={i === page
                  ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Ep {start}–{end}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
        {visible.map(ep => (
          <button key={ep.id}
            onClick={() => navigate('/watch/' + animeId + '/' + encodeURIComponent(ep.id))}
            className={cn('py-2 px-1 rounded-xl text-center text-xs font-bold transition-all duration-200 font-mono-nums hover:scale-105', ep.id === lastEpisodeId ? 'shadow-glow-sm' : '')}
            style={ep.id === lastEpisodeId
              ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {ep.number}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const { getForAnime } = useWatchHistory();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true); setError(null);
      const data = await mobinime.detail(id);
      setAnime(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16" style={{ background: '#0a0a12' }}>
          <div className="h-56 sm:h-72 skeleton-wave" />
          <div className="max-w-5xl mx-auto px-4 -mt-16 pb-20">
            <div className="flex gap-5">
              <div className="w-32 shrink-0 rounded-2xl skeleton-wave" style={{ aspectRatio: '2/3' }} />
              <div className="flex-1 pt-16 space-y-3">
                <div className="h-8 w-64 rounded-xl skeleton-wave" />
                <div className="h-4 w-40 rounded-xl skeleton-wave" />
                <div className="h-4 w-32 rounded-xl skeleton-wave" />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !anime) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20" style={{ background: '#0a0a12' }}>
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <EmptyState type="error" description={error || 'Anime not found'} onRetry={fetchDetail} />
            <div className="mt-4">
              <Link to="/" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const imageUrl = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '';
  const episodes = [...(anime.episodes || [])].sort((a, b) => (a.number||0) - (b.number||0));
  const firstEp = episodes[0];
  const genres = anime.genres || (anime.categories?.map(c => c.title)) || [];
  const year = anime.year || anime.tahun;
  const totalEps = anime.totalEpisode || anime.totalEpisodes || episodes.length;
  const lastWatched = id ? getForAnime(id) : null;
  const description = anime.englishSynopsis || anime.displayDescription || anime.content || anime.description || '';
  const descShort = description.length > 300;
  const displayDesc = descShort && !descExpanded ? description.slice(0, 300) + '…' : description;

  return (
    <>
      <Helmet>
        <title>{anime.title} — ToxiNime</title>
        <meta name="description" content={'Watch ' + anime.title + ' online free on ToxiNime. ' + (description.slice(0, 120) || '')} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-20" style={{ background: '#0a0a12' }}>
        <div className="relative h-60 sm:h-72 md:h-80 overflow-hidden">
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full h-full object-cover hero-scale" style={{ filter: 'blur(3px) brightness(0.28)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,18,0.15), rgba(10,10,18,0.75) 65%, #0a0a12 100%)' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <div className="relative flex flex-col sm:flex-row gap-6 -mt-24 mb-8">
            <div className="shrink-0 self-start">
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 140, aspectRatio: '2/3', border: '2px solid rgba(167,139,250,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                {imageUrl
                  ? <img src={imageUrl} alt={anime.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full skeleton-wave" />}
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-20 sm:pt-4">
              <Link to="/" className="inline-flex items-center gap-1 text-xs mb-3 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Home
              </Link>

              <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-1" style={{ color: '#e2e8f0' }}>
                {anime.title}
              </h1>
              {anime.other_title && (
                <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{anime.other_title}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                {anime.rating && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                    <Star className="w-3 h-3 fill-current" /> {Number(anime.rating).toFixed(1)}
                  </span>
                )}
                {anime.type && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold uppercase" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                    <Tv className="w-3 h-3" /> {anime.type}
                  </span>
                )}
                {anime.status && (
                  <span className="px-2 py-1 rounded-lg font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                    {anime.status}
                  </span>
                )}
                {year && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                    <Calendar className="w-3 h-3" /> {year}
                  </span>
                )}
                {totalEps > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono-nums" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                    <Clock className="w-3 h-3" /> {totalEps} eps
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {lastWatched && (
                  <button onClick={() => navigate('/watch/' + id + '/' + encodeURIComponent(lastWatched.episodeId))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-glow"
                    style={{ background: 'rgba(167,139,250,0.9)', color: '#0f1117' }}>
                    <History className="w-4 h-4" /> Continue Ep {lastWatched.episodeNumber}
                  </button>
                )}
                {firstEp && (
                  <button onClick={() => navigate('/watch/' + id + '/' + encodeURIComponent(firstEp.id))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                    style={lastWatched
                      ? { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }
                      : { background: 'rgba(167,139,250,0.9)', color: '#0f1117', boxShadow: '0 0 24px rgba(167,139,250,0.4)' }}>
                    <Play className="w-4 h-4 fill-current" /> {lastWatched ? 'Start Over' : 'Watch Now'}
                  </button>
                )}
                {!firstEp && !loading && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                    <Info className="w-4 h-4" /> No episodes available yet
                  </div>
                )}
              </div>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g, i) => <GenreBadge key={i} genre={typeof g === 'string' ? g : String(g)} />)}
                </div>
              )}
            </div>
          </div>

          {description && (
            <div className="p-5 rounded-2xl mb-5 scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Synopsis</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{displayDesc}</p>
              {descShort && (
                <button onClick={() => setDescExpanded(e => !e)} className="mt-2 text-xs font-semibold" style={{ color: '#a78bfa' }}>
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {episodes.length > 0 && (
            <div className="p-5 rounded-2xl scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Episodes ({episodes.length})
                </h2>
                <div className="flex items-center gap-3">
                  {lastWatched && (
                    <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                      Last: Ep {lastWatched.episodeNumber}
                    </span>
                  )}
                  {firstEp && (
                    <button onClick={() => navigate('/watch/' + id + '/' + encodeURIComponent(firstEp.id))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(167,139,250,0.85)', color: '#0f1117' }}>
                      <Play className="w-3 h-3 fill-current" /> Play
                    </button>
                  )}
                </div>
              </div>
              <EpisodeGrid episodes={episodes} animeId={id!} lastEpisodeId={lastWatched?.episodeId} />
            </div>
          )}

          {episodes.length === 0 && !loading && (
            <div className="p-8 rounded-2xl text-center scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>No episodes available</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Episodes may not be available for streaming yet, or this title might not be supported by the current provider.</p>
              <button onClick={fetchDetail} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
