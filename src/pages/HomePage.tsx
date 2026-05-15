import { useEffect, useState, useCallback, useRef } from 'react';
  import { Helmet } from 'react-helmet-async';
  import { Link, useNavigate } from 'react-router-dom';
  import { Play, Sparkles, TrendingUp, Clock, ChevronRight, Calendar, Star, X } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { AnimeCard, AnimeCardSkeleton } from '@/components/AnimeCard';
  import { EmptyState } from '@/components/EmptyState';
  import { mobinime, type HomepageData, type AnimeItem } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  const DAY_MAP: Record<number, string> = {
    1:'Sunday',2:'Monday',3:'Tuesday',4:'Wednesday',5:'Thursday',6:'Friday',7:'Saturday',
  };
  const getApiDayIndex = (jsDay: number) => jsDay + 1;

  /* ── Horizontal scroll row ─────────────────────────────────────────────────── */
  function HRow({ title, icon: Icon, items, viewAll, loading, cardWidth = 140 }: {
    title: string; icon: React.ElementType; items: AnimeItem[]; viewAll?: string;
    loading?: boolean; cardWidth?: number;
  }) {
    const rowRef = useRef<HTMLDivElement>(null);
    return (
      <section className="scroll-fade">
        <div className="flex items-center justify-between mb-4 px-4 sm:px-0" data-aos="fade-right">
          <h2 className="flex items-center gap-2 text-base font-black" style={{ color: '#e2e8f0' }}>
            <Icon className="w-4 h-4" style={{ color: '#a78bfa' }} />
            {title}
          </h2>
          {viewAll && (
            <Link to={viewAll} className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80" style={{ color: '#a78bfa' }}>
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <div ref={rowRef} className="h-scroll-row px-4 sm:px-0">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ width: cardWidth, minWidth: cardWidth }}>
                  <AnimeCardSkeleton />
                </div>
              ))
            : items.map((anime, i) => (
                <div key={anime.id} data-aos="zoom-in-up" data-aos-delay={String(Math.min(i * 50, 400))} style={{ width: cardWidth, minWidth: cardWidth }}>
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))
          }
        </div>
      </section>
    );
  }

  /* ── Cinematic hero ─────────────────────────────────────────────────────────── */
  function Hero({ anime, loading }: { anime: AnimeItem | null; loading: boolean }) {
    const navigate = useNavigate();
    if (loading || !anime) {
      return (
        <section className="relative h-[70vh] max-h-[640px] overflow-hidden" style={{ minHeight: 380 }}>
          <div className="w-full h-full skeleton-wave" />
        </section>
      );
    }
    const img = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '';
    const firstEp = anime.episodes?.[0];
    const genres = anime.genres || anime.categories?.map(c => c.title) || [];

    return (
      <section className="relative h-[72vh] max-h-[680px] overflow-hidden fade-in" style={{ minHeight: 400 }}>
        {img && (
          <img src={img} alt={anime.title} className="absolute inset-0 w-full h-full object-cover hero-scale"
            style={{ filter: 'brightness(0.38)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,18,0.96) 30%, rgba(10,10,18,0.4) 70%, transparent 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0f1117 0%, transparent 45%)' }} />

        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-8 pb-12 max-w-2xl">
          <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
            {genres.slice(0, 3).map((g, i) => (
              <span key={i} className="inline-block mr-2 mb-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                {g}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight fade-in-up" style={{ color: '#f1f5f9', animationDelay: '0.15s' }}>
            {anime.title}
          </h1>
          {anime.rating && (
            <div className="flex items-center gap-2 mb-3 fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold font-mono-nums" style={{ color: '#fbbf24' }}>{Number(anime.rating).toFixed(1)}</span>
              {anime.status && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>· {anime.status}</span>}
            </div>
          )}
          {(anime.displayDescription || anime.englishSynopsis) && (
            <p className="text-sm mb-5 line-clamp-2 fade-in-up" style={{ color: 'rgba(255,255,255,0.65)', animationDelay: '0.22s', lineHeight: 1.6 }}>
              {anime.displayDescription || anime.englishSynopsis}
            </p>
          )}
          <div className="flex flex-wrap gap-3 fade-in-up" style={{ animationDelay: '0.28s' }}>
            <button
              onClick={() => firstEp ? navigate('/watch/' + anime.id + '/' + firstEp.id) : navigate('/anime/' + anime.id)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm shadow-glow hover:opacity-90 transition-opacity"
              style={{ background: 'rgba(167,139,250,0.9)', color: '#0f1117' }}>
              <Play className="w-4 h-4 fill-current" /> Watch Now
            </button>
            <Link to={'/anime/' + anime.id}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/12"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Sparkles className="w-4 h-4" /> Details
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* ── Schedule tab row ───────────────────────────────────────────────────────── */
  function ScheduleRow({ schedule, activeDay, setActiveDay }: {
    schedule: Record<string, AnimeItem[]>; activeDay: number; setActiveDay: (d: number) => void;
  }) {
    const days = [2,3,4,5,6,7,1];
    const current = schedule[activeDay.toString()] || [];
    if (!Object.keys(schedule).length) return null;
    return (
      <section className="scroll-fade">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-black" style={{ color: '#e2e8f0' }}>
            <Calendar className="w-4 h-4" style={{ color: '#a78bfa' }} /> Schedule
          </h2>
        </div>
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {days.map(d => (
            <button key={d} onClick={() => setActiveDay(d)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0"
              style={activeDay === d
                ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {DAY_MAP[d]}
            </button>
          ))}
        </div>
        {current.length > 0 ? (
          <div className="h-scroll-row">
            {current.map((anime, i) => (
              <div key={anime.id} style={{ width: 140, minWidth: 140 }}>
                <AnimeCard anime={anime} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No anime scheduled for this day.</p>
        )}
      </section>
    );
  }

  /* ── Continue watching row ──────────────────────────────────────────────────── */
  function HistoryRow({ history, remove }: { history: ReturnType<typeof useWatchHistory>['history']; remove: (id: string) => void }) {
    if (!history.length) return null;
    return (
      <section className="scroll-fade">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-black" style={{ color: '#e2e8f0' }}>
            <Clock className="w-4 h-4" style={{ color: '#a78bfa' }} /> Continue Watching
          </h2>
          <Link to="/history" className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80" style={{ color: '#a78bfa' }}>
            See all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="h-scroll-row">
          {history.slice(0, 10).map((item) => (
            <div key={item.animeId + item.episodeId} className="relative group/h" style={{ width: 140, minWidth: 140 }}>
              <Link to={'/watch/' + item.animeId + '/' + item.episodeId} className="block">
                <div className="rounded-2xl overflow-hidden anime-card-enter" style={{ aspectRatio: '2/3', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {item.poster
                    ? <img src={item.poster} alt={item.animeTitle} className="w-full h-full object-cover" />
                    : <div className="w-full h-full skeleton-wave" />}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,18,0.95) 0%, transparent 55%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[11px] font-bold leading-tight line-clamp-2" style={{ color: '#e2e8f0' }}>{item.animeTitle}</p>
                    <span className="text-[10px] font-mono-nums" style={{ color: '#a78bfa' }}>Ep {item.episodeNumber}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/h:opacity-100 transition-opacity">
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(167,139,250,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play className="w-5 h-5 fill-white text-white" style={{ marginLeft: 3 }} />
                    </div>
                  </div>
                </div>
              </Link>
              <button onClick={() => remove(item.animeId)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/h:opacity-100 transition-opacity z-10"
                style={{ background: 'rgba(0,0,0,0.8)', color: 'rgba(255,255,255,0.7)' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ── Main export ─────────────────────────────────────────────────────────────── */
  export default function HomePage() {
    const [data, setData] = useState<HomepageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDay, setActiveDay] = useState(getApiDayIndex(new Date().getDay()));
    const { history, remove } = useWatchHistory();

    const fetchData = useCallback(async () => {
      try { setLoading(true); setError(null); setData(await mobinime.homepage()); }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); }
      finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const recommended = data?.recommend || data?.recommended || [];
    const ongoing     = data?.ongoing   || [];
    const schedule    = data?.schedule  || {};
    const hero        = recommended[0] || null;
    const restRecommended = recommended.slice(1);

    if (error && !data) {
      return (
        <><Navbar /><main className="min-h-screen pt-20 flex items-center justify-center" style={{ background: '#0f1117' }}>
          <EmptyState type="error" description={error} onRetry={fetchData} />
        </main></>
      );
    }

    return (
      <>
        <Helmet>
          <title>ToxiNime — Watch Anime Online Free</title>
          <meta name="description" content="Stream the latest anime series, movies, and OVAs free on ToxiNime. HD quality, no ads." />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pb-20 page-in" style={{ background: '#0f1117' }}>
          <Hero anime={hero} loading={loading} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 mt-8">
            <HistoryRow history={history} remove={remove} />

            <HRow title="Trending Now" icon={TrendingUp} items={restRecommended} viewAll="/anime/list/series" loading={loading} />

            <HRow title="Ongoing" icon={Sparkles} items={ongoing} viewAll="/anime/list/series" loading={loading} />

            {Object.keys(schedule).length > 0 && (
              <ScheduleRow schedule={schedule} activeDay={activeDay} setActiveDay={setActiveDay} />
            )}
          </div>
        </main>
      </>
    );
  }
  