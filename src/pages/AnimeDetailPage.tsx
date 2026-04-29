import { useEffect, useState, useCallback } from 'react';
  import { useParams, Link } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { Play, Star, Clock, Tag, Calendar, ChevronLeft, Loader2, History } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { GenreBadge } from '@/components/GenreBadge';
  import { EmptyState } from '@/components/EmptyState';
  import { Button } from '@/components/ui/button';
  import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  export default function AnimeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [anime, setAnime] = useState<AnimeItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getForAnime } = useWatchHistory();

    const fetchDetail = useCallback(async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await mobinime.detail(id);
        setAnime(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    if (loading) {
      return (<><Navbar /><main className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></main></>);
    }

    if (error || !anime) {
      return (
        <><Navbar />
        <main className="min-h-screen pt-20">
          <div className="container mx-auto px-4 py-12">
            <EmptyState type="error" description={error || 'Anime not found'} onRetry={fetchDetail} />
            <div className="text-center mt-4"><Button asChild variant="outline"><Link to="/">Back to Home</Link></Button></div>
          </div>
        </main></>
      );
    }

    const imageUrl = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '/placeholder.svg';
    const episodes = [...(anime.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
    const description = anime.content || anime.description;
    const genres = anime.categories?.map(c => c.title) || anime.genres || [];
    const totalEpisodes = anime.totalEpisode || anime.totalEpisodes || episodes.length;
    const historyEntry = id ? getForAnime(id) : null;
    const continueEpisode = historyEntry ? episodes.find(ep => ep.id === historyEntry.episodeId) : null;

    return (
      <>
        <Helmet>
          <title>{anime.title} - ToxiNime</title>
          <meta name="description" content={'Watch ' + anime.title + ' online free on ToxiNime.'} />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pt-20">
          <div className="relative min-h-[60vh] md:min-h-[50vh] overflow-hidden">
            <div className="absolute inset-0">
              <img src={imageUrl} alt={anime.title} loading="lazy" className="w-full h-full object-cover blur-xl scale-110 opacity-30" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/50" />
            </div>
            <div className="container max-w-7xl mx-auto px-4 h-full relative z-10">
              <div className="h-full flex items-end pb-8 pt-8 md:pt-0">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 fade-in w-full">
                  <div className="w-40 sm:w-48 md:w-56 flex-shrink-0 mx-auto md:mx-0 mt-4 md:mt-0">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-muted">
                      <img src={imageUrl} alt={anime.title} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                      <ChevronLeft className="w-4 h-4" />Back
                    </Link>
                    <h1 className="text-2xl md:text-4xl font-bold mb-2">{anime.title}</h1>
                    {anime.other_title && <p className="text-sm text-muted-foreground mb-3 italic">{anime.other_title}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      {anime.rating && <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span>{anime.rating}</span></div>}
                      {anime.year && <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{anime.year}</span></div>}
                      {anime.status && <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{anime.status}</span></div>}
                      {anime.type && <div className="flex items-center gap-1"><Tag className="w-4 h-4" /><span className="capitalize">{anime.type}</span></div>}
                      {totalEpisodes > 0 && <span>{totalEpisodes} Episodes</span>}
                    </div>
                    {genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {genres.map((genre) => <GenreBadge key={genre} genre={genre} variant="filled" />)}
                      </div>
                    )}
                    {episodes.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {continueEpisode ? (
                          <>
                            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">
                              <Link to={'/watch/' + id + '/' + continueEpisode.id}>
                                <History className="w-4 h-4 mr-2" />Continue EP {historyEntry?.episodeNumber}
                              </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                              <Link to={'/watch/' + id + '/' + episodes[0].id}>
                                <Play className="w-4 h-4 mr-2 fill-current" />From EP 1
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">
                            <Link to={'/watch/' + id + '/' + episodes[0].id}>
                              <Play className="w-5 h-5 mr-2 fill-current" />Watch Now
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container max-w-7xl mx-auto px-4 py-8">
            {description && (
              <section className="mb-8 scroll-fade">
                <h2 className="text-lg font-semibold mb-3">Synopsis</h2>
                <div className="text-muted-foreground leading-relaxed max-w-4xl prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: description as string }} />
              </section>
            )}
            {episodes.length > 0 && (
              <section className="scroll-fade">
                <h2 className="text-lg font-semibold mb-4">Episodes ({episodes.length})</h2>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                  {episodes.map((episode: Episode, index: number) => {
                    const isWatched = historyEntry?.episodeId === episode.id;
                    return (
                      <Link
                        key={episode.id}
                        to={'/watch/' + id + '/' + episode.id}
                        className={cn(
                          'group relative flex items-center justify-center p-3 rounded-lg border transition-all duration-200',
                          isWatched ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-card border-border/50 hover:border-accent hover:bg-accent/10 text-foreground'
                        )}
                        style={{ animationDelay: (index * 0.02) + 's' }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-medium text-sm group-hover:opacity-0 transition-opacity">{episode.number || index + 1}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
            {episodes.length === 0 && <EmptyState type="anime" title="No episodes available" description="Episodes for this anime are not available yet." />}
          </div>
        </main>
      </>
    );
  }