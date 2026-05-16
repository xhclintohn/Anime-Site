import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Star, Clock, Calendar, ChevronLeft, History, Info, Tv, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { GenreBadge } from '@/components/GenreBadge';
import { EmptyState } from '@/components/EmptyState';
import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
import { useWatchHistory } from '@/hooks/useWatchHistory';

const EP_PAGE_SIZE = 60;

const WAVE_HEIGHTS = [24, 36, 50, 64, 76, 86, 76, 64, 50, 36, 24, 32, 48, 62, 74];

function WaveLoader() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#0a0a12' }}>
        <div className="relative overflow-hidden" style={{ height: 280 }}>
          <div className="absolute inset-0 skeleton-wave" style={{ opacity: 0.5 }} />
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
            {WAVE_HEIGHTS.map((h, i) => (
              <div key={i} style={{
                width: 3.5,
                height: h,
                background: 'rgba(167,139,250,0.75)',
                borderRadius: 99,
                animation: 'waveBar 1.1s ease-in-out infinite',
                animationDelay: `${i * 0.08}s`,
                transformOrigin: 'center',
              }} />
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-20" style={{ marginTop: -80 }}>
          <div className="flex flex-col sm:flex-row gap-5 mb-8">
            <div className="shrink-0 self-start rounded-2xl skeleton-wave" style={{ width: 140, aspectRatio: '2/3' }} />
            <div className="flex-1 space-y-3" style={{ paddingTop: 80 }}>
              <div className="h-8 w-56 rounded-xl skeleton-wave" />
              <div className="h-4 w-44 rounded-xl skeleton-wave" />
              <div className="h-4 w-36 rounded-xl skeleton-wave" />
              <div className="flex gap-2 mt-5">
                <div className="h-10 w-32 rounded-xl skeleton-wave" />
                <div className="h-10 w-24 rounded-xl skeleton-wave" />
              </div>
              <div className="flex gap-2">
                {[0,1,2,3].map(i => <div key={i} className="h-6 w-16 rounded-lg skeleton-wave" />)}
              </div>
            </div>
          </div>
          <div className="h-32 rounded-2xl skeleton-wave mb-4" />
          <div className="h-72 rounded-2xl skeleton-wave" />
        </div>
      </main>
    </>
  );
}

function EpisodeGrid({ episodes, animeId, lastEpisodeId }: { episodes: Episode[]; animeId: string; lastEpisodeId?: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(episodes.length / EP_PAGE_SIZE);
  const visible = episodes.slice(page * EP_PAGE_SIZE, (page + 1) * EP_PAGE_SIZE);

  return (
    <div>
      {totalPages > 1 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide pb-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            const start = i * EP_PAGE_SIZE + 1;
            const end = Math.min((i + 1) * EP_PAGE_SIZE, episodes.length);
            return (
              <button key={i} onClick={() => setPage(i)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200"
                style={i === page
                  ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Ep {start}–{end}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {visible.map(ep => {
          const isActive = ep.id === lastEpisodeId;
          return (
            <button key={ep.id}
              onClick={() => navigate('/watch/' + animeId + '/' + encodeURIComponent(ep.id))}
              className="group relative flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 font-mono-nums"
              style={isActive
                ? { background: 'linear-gradient(135deg,rgba(167,139,250,0.9),rgba(129,140,248,0.75))', color: '#0f1117', boxShadow: '0 6px 20px rgba(167,139,250,0.4)', border: 'none' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.08)' }
              }>
              <span className="text-[10px] font-bold leading-none" style={{ opacity: isActive ? 0.65 : 0.4 }}>EP</span>
              <span className="text-[13px] font-black leading-tight">{ep.number}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: 'rgba(15,17,23,0.6)' }} />
              )}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: 'rgba(167,139,250,0.1)', boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.22)' }} />
              )}
            </button>
          );
        })}
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
  const [trackType, setTrackType] = useState<'sub' | 'dub'>('sub');
  const epsSectionRef = useRef<HTMLDivElement>(null);
  const { getForAnime } = useWatchHistory();

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [id]);

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

  if (loading) return <WaveLoader />;

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
  const hasDub = !!(anime.dubEpisodes && anime.dubEpisodes.length > 0);
  const rawEps = trackType === 'dub' && hasDub ? anime.dubEpisodes! : (anime.episodes || []);
  const episodes = [...rawEps].sort((a, b) => (a.number || 0) - (b.number || 0));
  const firstEp = episodes[0];
  const genres = anime.genres || (anime.categories?.map(c => c.title)) || [];
  const year = anime.year || anime.tahun;
  const totalEps = anime.totalEpisode || anime.totalEpisodes || episodes.length;
  const lastWatched = id ? getForAnime(id) : null;
  const description = anime.englishSynopsis || anime.displayDescription || anime.content || anime.description || '';
  const descShort = description.length > 300;
  const displayDesc = descShort && !descExpanded ? description.slice(0, 300) + '…' : description;

  const scrollToEps = () => epsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <Helmet>
        <title>{anime.title} — ToxiNime</title>
        <meta name="description" content={'Watch ' + anime.title + ' online free on ToxiNime. ' + (description.slice(0, 120) || '')} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-20" style={{ background: '#0a0a12' }}>
        <div className="relative h-60 sm:h-72 md:h-80 overflow-hidden" data-aos="fade-down">
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full h-full object-cover hero-scale" style={{ filter: 'blur(4px) brightness(0.25)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,18,0.1), rgba(10,10,18,0.7) 65%, #0a0a12 100%)' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <div className="relative flex flex-col sm:flex-row gap-6 mb-8" style={{ marginTop: -96 }} data-aos="fade-up">
            <div className="shrink-0 self-start">
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 140, aspectRatio: '2/3', border: '2px solid rgba(167,139,250,0.22)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}>
                {imageUrl
                  ? <img src={imageUrl} alt={anime.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full skeleton-wave" />}
              </div>
            </div>

            <div className="flex-1 min-w-0" style={{ paddingTop: 80 }}>
              <Link to="/" className="inline-flex items-center gap-1 text-xs mb-3 transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Home
              </Link>

              <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-1" style={{ color: '#e2e8f0' }}>
                {anime.title}
              </h1>
              {anime.other_title && (
                <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>{anime.other_title}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
                {anime.rating && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <Star className="w-3 h-3 fill-current" /> {Number(anime.rating).toFixed(1)}
                  </span>
                )}
                {anime.type && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold uppercase" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}>
                    <Tv className="w-3 h-3" /> {anime.type}
                  </span>
                )}
                {anime.status && (
                  <span className="px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)' }}>
                    {anime.status}
                  </span>
                )}
                {year && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Calendar className="w-3 h-3" /> {year}
                  </span>
                )}
                {totalEps > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono-nums" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Clock className="w-3 h-3" /> {totalEps} eps
                  </span>
                )}
                {hasDub && (
                  <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.18)' }}>
                    DUB Available
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 mb-5">
                {lastWatched && (
                  <button onClick={() => navigate('/watch/' + id + '/' + encodeURIComponent(lastWatched.episodeId))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-glow transition-opacity hover:opacity-90"
                    style={{ background: 'rgba(167,139,250,0.9)', color: '#0f1117' }}>
                    <History className="w-4 h-4" /> Continue Ep {lastWatched.episodeNumber}
                  </button>
                )}
                {firstEp && (
                  <button onClick={scrollToEps}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                    style={lastWatched
                      ? { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }
                      : { background: 'rgba(167,139,250,0.9)', color: '#0f1117', boxShadow: '0 0 28px rgba(167,139,250,0.4)' }}>
                    <Play className="w-4 h-4 fill-current" />
                    {lastWatched ? 'Episodes' : 'Watch Now'}
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
                {!firstEp && !loading && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
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
            <div className="p-5 rounded-2xl mb-5 scroll-fade" data-aos="flip-up" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.28)' }}>Synopsis</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{displayDesc}</p>
              {descShort && (
                <button onClick={() => setDescExpanded(e => !e)} className="mt-2 text-xs font-semibold" style={{ color: '#a78bfa' }}>
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {episodes.length > 0 && (
            <div ref={epsSectionRef} className="p-5 rounded-2xl scroll-fade" data-aos="fade-up" data-aos-delay="100"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Episodes <span className="font-mono-nums" style={{ color: '#a78bfa' }}>({episodes.length})</span>
                  </h2>
                  {hasDub && (
                    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      <button onClick={() => setTrackType('sub')}
                        className="px-3 py-1 text-[11px] font-black uppercase tracking-wide transition-all"
                        style={trackType === 'sub'
                          ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117' }
                          : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
                        SUB
                      </button>
                      <button onClick={() => setTrackType('dub')}
                        className="px-3 py-1 text-[11px] font-black uppercase tracking-wide transition-all"
                        style={trackType === 'dub'
                          ? { background: 'rgba(251,146,60,0.85)', color: '#0f1117' }
                          : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
                        DUB
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {lastWatched && (
                    <span className="text-xs font-semibold font-mono-nums" style={{ color: '#a78bfa' }}>
                      Last watched: Ep {lastWatched.episodeNumber}
                    </span>
                  )}
                  {firstEp && (
                    <button onClick={() => navigate('/watch/' + id + '/' + encodeURIComponent(firstEp.id))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all hover:opacity-90"
                      style={{ background: 'rgba(167,139,250,0.85)', color: '#0f1117', boxShadow: '0 4px 14px rgba(167,139,250,0.3)' }}>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {lastWatched ? 'Start Over' : 'Start Watching'}
                    </button>
                  )}
                </div>
              </div>
              <EpisodeGrid episodes={episodes} animeId={id!} lastEpisodeId={lastWatched?.episodeId} />
            </div>
          )}

          {episodes.length === 0 && !loading && (
            <div className="p-10 rounded-2xl text-center scroll-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.18)' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>No episodes available</p>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.28)' }}>
                This title may not be available through the current provider yet.
              </p>
              <button onClick={fetchDetail} className="px-4 py-2 rounded-xl text-xs font-semibold"
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
