import { useEffect, useState, useCallback } from 'react';
  import { Helmet } from 'react-helmet-async';
  import { Link } from 'react-router-dom';
  import { Calendar, Sparkles, TrendingUp, Clock, Play, ChevronRight, Zap, X, MessageCircle } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { AnimeCard } from '@/components/AnimeCard';
  import { SectionHeader } from '@/components/SectionHeader';
  import { LoadingGrid } from '@/components/LoadingGrid';
  import { EmptyState } from '@/components/EmptyState';
  import { mobinime, type HomepageData, type AnimeItem } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  const WA_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCKkVc7z4kh02WGqF0m';

  const DAY_MAP: Record<number, string> = {
    1: 'Sunday', 2: 'Monday', 3: 'Tuesday', 4: 'Wednesday',
    5: 'Thursday', 6: 'Friday', 7: 'Saturday',
  };

  const getApiDayIndex = (jsDay: number): number => jsDay + 1;

  export default function HomePage() {
    const [data, setData] = useState<HomepageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDay, setActiveDay] = useState(getApiDayIndex(new Date().getDay()));
    const { history, remove } = useWatchHistory();

    const fetchData = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await mobinime.homepage();
        setData(response);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const recommendedAnime = data?.recommend || data?.recommended || data?.popular || [];
    const ongoingAnime = data?.ongoing || [];
    const scheduleData = data?.schedule || {};
    const currentSchedule = scheduleData[activeDay.toString()] || [];
    const recentHistory = history.slice(0, 12);

    return (
      <>
        <Helmet>
          <title>ToxiNime — Watch Anime Online Free</title>
          <meta name="description" content="Stream the latest anime series, movies, and OVAs free on ToxiNime. HD quality, no ads, dual source." />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pb-20">
          <section className="relative overflow-hidden pt-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_60%)]" />
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
              <div className="max-w-2xl fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-bold mb-6 badge-glow uppercase tracking-wider">
                  <Zap className="w-3 h-3" style={{ fill: '#a78bfa', color: '#a78bfa' }} />
                  Free HD Streaming — No Ads
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-5 leading-[1.05]">
                  The Anime<br />
                  <span className="text-gradient">Experience</span>
                  <br />You Deserve
                </h1>
                <p className="text-base md:text-xl text-muted-foreground max-w-lg mb-8 leading-relaxed">
                  Thousands of anime — from the hottest seasonal hits to timeless classics. All free, all in HD.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/search"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-accent-foreground font-bold text-sm shadow-glow hover:scale-105 transition-transform duration-200"
                  >
                    <Sparkles className="w-4 h-4" /> Browse Anime
                  </Link>
                  <Link
                    to="/history"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-muted/60 border border-border/40 text-foreground/80 font-bold text-sm hover:bg-muted hover:text-foreground transition-all duration-200"
                  >
                    <Clock className="w-4 h-4" /> My History
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 space-y-16 mt-4">
            {recentHistory.length > 0 && (
              <section className="scroll-fade">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Continue Watching</h2>
                      <p className="text-xs text-muted-foreground">Pick up where you left off</p>
                    </div>
                  </div>
                  <Link to="/history" className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-semibold transition-colors">
                    See all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {recentHistory.map((entry) => (
                    <div key={entry.animeId + entry.episodeId} className="relative shrink-0 w-36 sm:w-44 group">
                      <Link to={'/watch/' + entry.animeId + '/' + entry.episodeId} className="block">
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted relative shadow-lg">
                          {entry.poster ? (
                            <img src={entry.poster} alt={entry.animeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2">
                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/95 text-accent-foreground text-[10px] font-bold">
                              <Play className="w-2 h-2 fill-accent-foreground" />EP {entry.episodeNumber}
                            </span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-11 h-11 rounded-full bg-accent/90 shadow-glow flex items-center justify-center">
                              <Play className="w-5 h-5 text-accent-foreground fill-accent-foreground ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-semibold line-clamp-2 text-foreground/80 group-hover:text-accent transition-colors">{entry.animeTitle}</p>
                      </Link>
                      <button
                        onClick={() => remove(entry.animeId)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80 text-muted-foreground hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {error && !loading && (
              <EmptyState type="error" description={error} onRetry={fetchData} />
            )}

            {!error && (
              <section className="scroll-fade">
                <SectionHeader title="Recommended For You" href="/anime/list/series" />
                {loading ? (
                  <LoadingGrid count={12} />
                ) : recommendedAnime.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {recommendedAnime.slice(0, 12).map((anime: AnimeItem, index: number) => (
                      <AnimeCard key={anime.id} anime={anime} index={index} />
                    ))}
                  </div>
                ) : (
                  <EmptyState type="anime" description="Check back soon for recommendations." />
                )}
              </section>
            )}

            {!error && (
              <section className="scroll-fade">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-black">Currently Airing</h2>
                </div>
                {loading ? (
                  <LoadingGrid count={12} />
                ) : ongoingAnime.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {ongoingAnime.slice(0, 12).map((anime: AnimeItem, index: number) => (
                      <AnimeCard key={anime.id} anime={anime} index={index} showEpisode />
                    ))}
                  </div>
                ) : !loading ? (
                  <EmptyState type="anime" description="Loading current season..." />
                ) : null}
              </section>
            )}

            {!error && Object.keys(scheduleData).length > 0 && (
              <section className="scroll-fade">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-black">Airing Schedule</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
                  {[1,2,3,4,5,6,7].map((dayIdx) => {
                    const isToday = dayIdx === getApiDayIndex(new Date().getDay());
                    return (
                      <button
                        key={dayIdx}
                        onClick={() => setActiveDay(dayIdx)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 border',
                          activeDay === dayIdx
                            ? 'bg-accent text-accent-foreground border-accent shadow-glow'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/40'
                        )}
                      >
                        {DAY_MAP[dayIdx]}{isToday ? ' · Today' : ''}
                      </button>
                    );
                  })}
                </div>
                {currentSchedule.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {currentSchedule.map((anime: AnimeItem, index: number) => (
                      <AnimeCard key={anime.id} anime={anime} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-16 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No anime airing on {DAY_MAP[activeDay]}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>

        <footer className="border-t border-border/40 py-10 mt-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-accent fill-accent" />
                  <span className="font-black text-lg">Toxi<span className="text-accent">Nime</span></span>
                </div>
                <p className="text-xs text-muted-foreground">Free anime streaming for educational use only.</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {[['Series', '/anime/list/series'],['Movies', '/anime/list/movie'],['OVA', '/anime/list/ova'],['Genres', '/genres'],['History', '/history']].map(([l,h]) => (
                  <Link key={h} to={h} className="text-xs text-muted-foreground hover:text-accent transition-colors">{l}</Link>
                ))}
                <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            </div>
            <div className="border-t border-border/30 mt-8 pt-6 text-center">
              <p className="text-xs text-muted-foreground/50">© 2025 ToxiNime. Content belongs to their respective owners.</p>
            </div>
          </div>
        </footer>
      </>
    );
  }