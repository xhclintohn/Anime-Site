import { useEffect, useState, useCallback } from 'react';
  import { useParams, Link, useNavigate } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { ChevronLeft, ChevronRight, List, Loader2, AlertCircle, ExternalLink, Moon, Sun, X } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { VideoPlayer } from '@/components/VideoPlayer';
  import { EmptyState } from '@/components/EmptyState';
  import { Button } from '@/components/ui/button';
  import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  export default function StreamPage() {
    const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
    const navigate = useNavigate();
    const { save } = useWatchHistory();

    const [anime, setAnime] = useState<AnimeItem | null>(null);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [streamLoading, setStreamLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [quality, setQuality] = useState<string>('HD');
    const [showEpisodes, setShowEpisodes] = useState(false);
    const [cinemaMode, setCinemaMode] = useState(false);

    const fetchAnimeDetail = useCallback(async () => {
      if (!animeId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await mobinime.detail(animeId);
        setAnime(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }, [animeId]);

    const fetchStream = useCallback(async () => {
      if (!animeId || !episodeId) return;
      try {
        setStreamLoading(true);
        setStreamError(null);
        const url = await mobinime.stream(animeId, episodeId, { quality });
        setStreamUrl(url);
      } catch (err: unknown) {
        setStreamError(err instanceof Error ? err.message : 'Failed to get stream');
      } finally {
        setStreamLoading(false);
      }
    }, [animeId, episodeId, quality]);

    useEffect(() => { fetchAnimeDetail(); }, [fetchAnimeDetail]);
    useEffect(() => { fetchStream(); }, [fetchStream]);

    useEffect(() => {
      if (!anime || !animeId || !episodeId || streamLoading || streamError) return;
      const episodes = [...(anime.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
      const currentEp = episodes.find(ep => ep.id === episodeId);
      const epNumber = currentEp?.number || (episodes.findIndex(ep => ep.id === episodeId) + 1);
      const poster = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail;
      save({ animeId, episodeId, episodeNumber: epNumber, animeTitle: anime.title, poster });
    }, [anime, animeId, episodeId, streamLoading, streamError, save]);

    const episodes = [...(anime?.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
    const currentEpisodeIndex = episodes.findIndex((ep: Episode) => ep.id === episodeId);
    const currentEpisode = episodes[currentEpisodeIndex];
    const prevEpisode = episodes[currentEpisodeIndex - 1];
    const nextEpisode = episodes[currentEpisodeIndex + 1];

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && cinemaMode) setCinemaMode(false);
        if (e.key === 'ArrowLeft' && prevEpisode && !e.ctrlKey && !e.metaKey) {
          navigate('/watch/' + animeId + '/' + prevEpisode.id);
        }
        if (e.key === 'ArrowRight' && nextEpisode && !e.ctrlKey && !e.metaKey) {
          navigate('/watch/' + animeId + '/' + nextEpisode.id);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cinemaMode, prevEpisode, nextEpisode, navigate, animeId]);

    const isEmbedUrl = streamUrl && (
      streamUrl.includes('embed') ||
      streamUrl.includes('player') ||
      streamUrl.includes('iframe') ||
      (!streamUrl.endsWith('.mp4') && !streamUrl.endsWith('.m3u8') && !streamUrl.endsWith('.webm'))
    );
    const isValidStreamUrl = streamUrl && (streamUrl.startsWith('http://') || streamUrl.startsWith('https://'));

    if (loading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen pt-20 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
            </div>
          </main>
        </>
      );
    }

    if (error) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen pt-20 bg-background">
            <div className="container mx-auto px-4 py-12">
              <EmptyState type="error" description={error} onRetry={fetchAnimeDetail} />
              <div className="text-center mt-4">
                <Button asChild variant="outline"><Link to="/">Back to Home</Link></Button>
              </div>
            </div>
          </main>
        </>
      );
    }

    const episodeNumber = currentEpisode?.number || currentEpisodeIndex + 1;
    const pageTitle = anime?.title ? anime.title + ' - Episode ' + episodeNumber + ' - ToxiNime' : 'Watch Anime - ToxiNime';
    const posterImage = anime?.image_cover || anime?.imageCover || anime?.poster || anime?.thumbnail;

    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={'Watch ' + (anime?.title || 'anime') + ' Episode ' + episodeNumber + ' free on ToxiNime.'} />
        </Helmet>
        {cinemaMode && <div className="fixed inset-0 bg-black/90 z-40" onClick={() => setCinemaMode(false)} />}
        {!cinemaMode && <Navbar />}
        <main className={cn('min-h-screen transition-all duration-300', cinemaMode ? 'pt-0 bg-black' : 'pt-16 sm:pt-20 pb-12 bg-background')}>
          <div className={cn('mx-auto px-4 transition-all duration-300', cinemaMode ? 'max-w-[1400px] py-4' : 'max-w-5xl')}>
            {!cinemaMode && (
              <Link to={'/anime/' + animeId} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to {anime?.title}
              </Link>
            )}
            <div className={cn('relative z-50 transition-all duration-300', cinemaMode ? 'mb-4' : 'mb-6')}>
              <div className={cn('absolute top-3 right-3 z-10 flex items-center gap-2', streamLoading && 'hidden')}>
                <Button variant="secondary" size="sm" onClick={() => setCinemaMode(!cinemaMode)} className="bg-background/80 backdrop-blur-sm hover:bg-background/90 gap-2 text-xs sm:text-sm">
                  {cinemaMode ? <><Sun className="w-4 h-4" /><span className="hidden sm:inline">Exit Cinema</span></> : <><Moon className="w-4 h-4" /><span className="hidden sm:inline">Cinema Mode</span></>}
                </Button>
                {cinemaMode && (
                  <Button variant="secondary" size="icon" onClick={() => setCinemaMode(false)} className="bg-background/80 backdrop-blur-sm h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {streamLoading ? (
                <div className="aspect-video bg-card rounded-xl flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Loading video...</p>
                </div>
              ) : streamError || !isValidStreamUrl ? (
                <div className="aspect-video bg-card rounded-xl flex flex-col items-center justify-center p-6">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Failed to load video</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">{streamError || 'Invalid stream URL'}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={fetchStream} variant="outline">Try Again</Button>
                    <Button onClick={() => setQuality(quality === 'HD' ? 'SD' : 'HD')} variant="outline">Try {quality === 'HD' ? 'SD' : 'HD'} Quality</Button>
                    {streamUrl && (
                      <Button asChild variant="outline" className="gap-2">
                        <a href={streamUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" />Open in Tab</a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : isEmbedUrl ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                  <iframe src={streamUrl} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" title={anime?.title + ' Episode ' + episodeNumber} />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden shadow-2xl">
                  <VideoPlayer src={streamUrl} poster={posterImage} title={'Episode ' + episodeNumber} onQualityChange={setQuality} qualities={['HD', 'SD']} currentQuality={quality} />
                </div>
              )}
            </div>

            {!streamLoading && !streamError && isEmbedUrl && isValidStreamUrl && (
              <div className={cn('mb-4 flex justify-end', cinemaMode && 'hidden sm:flex')}>
                <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors">
                  <ExternalLink className="w-4 h-4" /> Open in new tab
                </a>
              </div>
            )}

            <div className={cn('flex flex-col gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-300', cinemaMode ? 'bg-card/50 backdrop-blur-sm border-border/30' : 'bg-card border-border/50')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold truncate">{anime?.title}</h1>
                  <p className="text-sm text-accent font-medium mt-0.5">
                    Episode {episodeNumber}{currentEpisode?.title ? ' — ' + currentEpisode.title : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setShowEpisodes(!showEpisodes)} className="gap-2 text-xs">
                    <List className="w-4 h-4" /> Episodes
                  </Button>
                  <Button variant="outline" size="sm" disabled={!prevEpisode} onClick={() => prevEpisode && navigate('/watch/' + animeId + '/' + prevEpisode.id)} className="gap-1 text-xs">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button size="sm" disabled={!nextEpisode} onClick={() => nextEpisode && navigate('/watch/' + animeId + '/' + nextEpisode.id)} className="gap-1 text-xs bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {showEpisodes && episodes.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">All Episodes</p>
                  <div className="grid grid-cols-4 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-52 overflow-y-auto scrollbar-hide">
                    {episodes.map((ep: Episode) => (
                      <button key={ep.id} onClick={() => navigate('/watch/' + animeId + '/' + ep.id)} className={cn('py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 text-center', ep.id === episodeId ? 'bg-accent text-accent-foreground shadow-glow' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground')}>
                        {ep.number || '?'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }