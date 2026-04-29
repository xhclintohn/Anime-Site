import { useEffect, useState, useCallback } from 'react';
  import { Helmet } from 'react-helmet-async';
  import { Link } from 'react-router-dom';
  import { Calendar, Sparkles, TrendingUp, Clock, Play, ChevronRight, Zap, X } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { AnimeCard } from '@/components/AnimeCard';
  import { SectionHeader } from '@/components/SectionHeader';
  import { LoadingGrid } from '@/components/LoadingGrid';
  import { EmptyState } from '@/components/EmptyState';
  import { InformationCard } from '@/components/InformationCard';
  import { mobinime, type HomepageData, type AnimeItem } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

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
    const information = data?.information || [];
    const recentHistory = history.slice(0, 10);

    return (
      <>
        <Helmet>
          <title>ToxiNime - Watch Anime Online Free</title>
          <meta name="description" content="Stream the latest anime series, movies, and OVAs free on ToxiNime." />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pt-16 pb-16 page-enter">
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 relative">
              <div className="max-w-2xl fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-5 badge-glow">
                  <Zap className="w-3.5 h-3.5 fill-accent" />
                  <span>Stream Anime Free</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-[1.1]">
                  Your Anime
                  <span className="text-gradient block mt-1">Universe Awaits</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-lg">
                  Thousands of titles, all free. From the latest seasonal hits to timeless classics.
                </p>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 space-y-14">
            {information.length > 0 && (
              <section>
                {information.map((info, index) => (
                  <InformationCard key={info.id || index} title={info.title} description={info.desc || ''} />
                ))}
              </section>
            )}

            {recentHistory.length > 0 && (
              <section className="scroll-fade">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">Continue Watching</h2>
                      <p className="text-xs text-muted-foreground">Pick up where you left off</p>
                    </div>
                  </div>
                  <Link to="/history" className="text-xs text-accent hover:text-accent/80 font-medium flex items-center gap-1 transition-colors">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                  {recentHistory.map((entry) => (
                    <div key={entry.animeId + entry.episodeId} className="relative shrink-0 w-36 sm:w-44 group">
                      <Link to={'/watch/' + entry.animeId + '/' + entry.episodeId} className="block">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                          {entry.poster ? (
                            <img src={entry.poster} alt={entry.animeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/90 text-accent-foreground text-xs font-semibold w-fit">
                              <Play className="w-2.5 h-2.5 fill-accent-foreground" />
                              EP {entry.episodeNumber}
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium line-clamp-2 text-foreground group-hover:text-accent transition-colors">{entry.animeTitle}</p>
                      </Link>
                      <button
                        onClick={() => remove(entry.animeId)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/80 hover:text-white text-muted-foreground"
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
                  <LoadingGrid count={6} />
                ) : recommendedAnime.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {recommendedAnime.slice(0, 12).map((anime: AnimeItem, index: number) => (
                      <AnimeCard key={anime.id} anime={anime} index={index} />
                    ))}
                  </div>
                ) : (
                  <EmptyState type="anime" />
                )}
              </section>
            )}

            {!error && ongoingAnime.length > 0 && (
              <section className="scroll-fade">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold">Ongoing Anime</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {ongoingAnime.slice(0, 12).map((anime: AnimeItem, index: number) => (
                    <AnimeCard key={anime.id} anime={anime} index={index} showEpisode />
                  ))}
                </div>
              </section>
            )}

            {!error && (
              <section className="scroll-fade">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold">Weekly Schedule</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-5">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayIndex) => {
                    const isToday = dayIndex === getApiDayIndex(new Date().getDay());
                    return (
                      <button
                        key={dayIndex}
                        onClick={() => setActiveDay(dayIndex)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 border',
                          activeDay === dayIndex
                            ? 'bg-accent text-accent-foreground border-accent shadow-glow'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/40'
                        )}
                      >
                        {DAY_MAP[dayIndex]}
                        {isToday && <span className="ml-1.5 text-[10px] opacity-70">(Today)</span>}
                      </button>
                    );
                  })}
                </div>
                {loading ? (
                  <LoadingGrid count={6} />
                ) : currentSchedule.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {currentSchedule.map((anime: AnimeItem, index: number) => (
                      <AnimeCard key={anime.id} anime={anime} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No scheduled anime for {DAY_MAP[activeDay]}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>

        <footer className="border-t border-border/40 py-8 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-accent fill-accent" />
              <span className="font-black text-lg">Toxi<span className="text-accent">Nime</span></span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ToxiNime &middot; For educational and personal use only
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              {([['Series', '/anime/list/series'], ['Movies', '/anime/list/movie'], ['OVA', '/anime/list/ova'], ['Genres', '/genres']] as const).map(([label, href]) => (
                <Link key={href} to={href} className="text-xs text-muted-foreground hover:text-accent transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </footer>

        <div className="fixed bottom-6 right-6 z-40">
          <Link
            to="/search"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm shadow-glow hover:scale-105 transition-transform duration-200"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Find Anime</span>
          </Link>
        </div>
      </>
    );
  }