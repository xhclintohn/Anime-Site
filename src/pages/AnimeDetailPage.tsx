import { useEffect, useState, useCallback } from 'react';
  import { useParams, Link, useNavigate } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { Play, Star, Clock, Tag, Calendar, ChevronLeft, History, ChevronRight } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { GenreBadge } from '@/components/GenreBadge';
  import { EmptyState } from '@/components/EmptyState';
  import { Button } from '@/components/ui/button';
  import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  function EpisodeGrid({ episodes, animeId, lastEpisodeId }: { episodes: Episode[]; animeId: string; lastEpisodeId?: string }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? episodes : episodes.slice(0, 50);
    return (
      <div>
        <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
          {visible.map((ep) => (
            <Link
              key={ep.id}
              to={'/watch/' + animeId + '/' + ep.id}
              className={cn('py-2 px-1 rounded-xl text-center text-xs font-bold transition-all duration-200 font-mono-nums hover:scale-105', ep.id === lastEpisodeId ? 'shadow-glow-sm' : '')}
              style={ep.id === lastEpisodeId
                ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {ep.number}
            </Link>
          ))}
        </div>
        {episodes.length > 50 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-xs font-medium transition-colors"
            style={{ color: '#a78bfa' }}
          >
            {showAll ? 'Show less' : 'Show all ' + episodes.length + ' episodes'}
          </button>
        )}
      </div>
    );
  }

  export default function AnimeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [anime, setAnime] = useState<AnimeItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
          <main className="min-h-screen pt-20 flex items-center justify-center" style={{ background: '#0f1117' }}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.15)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading anime...</p>
            </div>
          </main>
        </>
      );
    }

    if (error || !anime) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen pt-20" style={{ background: '#0f1117' }}>
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
              <EmptyState type="error" description={error || 'Anime not found'} onRetry={fetchDetail} />
              <div className="text-center mt-4"><Button asChild variant="outline"><Link to="/">Back to Home</Link></Button></div>
            </div>
          </main>
        </>
      );
    }

    const imageUrl = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '';
    const episodes = [...(anime.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
    const firstEp = episodes[0];
    const genres = anime.genres || (anime.categories?.map(c => c.title)) || [];
    const year = anime.year || anime.tahun;
    const totalEps = anime.totalEpisode || anime.totalEpisodes || episodes.length;
    const lastWatched = id ? getForAnime(id) : null;
    // Use English description, prefer englishSynopsis then displayDescription
    const description = anime.englishSynopsis || anime.displayDescription || anime.content || anime.description;

    return (
      <>
        <Helmet>
          <title>{anime.title} - ToxiNime</title>
          <meta name="description" content={'Watch ' + anime.title + ' online free on ToxiNime.'} />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pb-20" style={{ background: '#0f1117' }}>
          {/* Hero banner */}
          <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-full h-full object-cover object-center" style={{ filter: 'blur(2px) brightness(0.3)', transform: 'scale(1.05)' }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,17,23,0.2), rgba(15,17,23,0.85) 70%, #0f1117 100%)' }} />
          </div>

          <div className="max-w-5xl mx-auto px-4">
            <div className="relative flex flex-col sm:flex-row gap-6 -mt-20 mb-8">
              {/* Poster */}
              <div className="shrink-0 self-start">
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 140, aspectRatio: '2/3', border: '2px solid rgba(167,139,250,0.2)' }}>
                  {imageUrl
                    ? <img src={imageUrl} alt={anime.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full skeleton-wave" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-20 sm:pt-2">
                <Link to="/" className="inline-flex items-center gap-1 text-xs mb-3 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Home
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-1" style={{ color: '#e2e8f0' }}>{anime.title}</h1>
                {anime.other_title && <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{anime.other_title}</p>}

                <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                  {anime.rating && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                      <Star className="w-3 h-3 fill-current" /> {Number(anime.rating).toFixed(1)}
                    </span>
                  )}
                  {anime.type && (
                    <span className="px-2 py-1 rounded-lg font-semibold uppercase" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>{anime.type}</span>
                  )}
                  {anime.status && (
                    <span className="px-2 py-1 rounded-lg font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>{anime.status}</span>
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

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {lastWatched ? (
                    <button
                      onClick={() => navigate('/watch/' + id + '/' + lastWatched.episodeId)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 shadow-glow"
                      style={{ background: 'rgba(167,139,250,0.9)', color: '#0f1117' }}
                    >
                      <History className="w-4 h-4" /> Continue Ep {lastWatched.episodeNumber}
                    </button>
                  ) : null}
                  {firstEp && (
                    <button
                      onClick={() => navigate('/watch/' + id + '/' + firstEp.id)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={lastWatched
                        ? { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }
                        : { background: 'rgba(167,139,250,0.9)', color: '#0f1117', boxShadow: '0 0 20px rgba(167,139,250,0.4)' }
                      }
                    >
                      <Play className="w-4 h-4 fill-current" /> {lastWatched ? 'Start Over' : 'Watch Now'}
                    </button>
                  )}
                </div>

                {/* Genres */}
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {genres.map((g, i) => <GenreBadge key={i} genre={typeof g === 'string' ? g : String(g)} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Description — always English */}
            {description && (
              <div className="p-5 rounded-2xl mb-6 scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Synopsis</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{description}</p>
              </div>
            )}

            {/* Episodes */}
            {episodes.length > 0 && (
              <div className="p-5 rounded-2xl scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Episodes ({episodes.length})
                  </h2>
                  {lastWatched && (
                    <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                      Last watched: Ep {lastWatched.episodeNumber}
                    </span>
                  )}
                </div>
                <EpisodeGrid episodes={episodes} animeId={id!} lastEpisodeId={lastWatched?.episodeId} />
              </div>
            )}
          </div>
        </main>
      </>
    );
  }
  