import { useEffect, useState, useCallback } from 'react';
  import { useParams, Link, useNavigate } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { ChevronLeft, ChevronRight, List, AlertCircle, ExternalLink, X } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { VideoPlayer } from '@/components/VideoPlayer';
  import { EmptyState } from '@/components/EmptyState';
  import { Button } from '@/components/ui/button';
  import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  function buildIframeSrc(url: string): string {
    return '/api/embed-proxy?url=' + encodeURIComponent(url);
  }

  function isEmbedType(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('/embed') || lower.includes('player') ||
      (!lower.endsWith('.mp4') && !lower.endsWith('.m3u8') && !lower.endsWith('.webm') && !lower.endsWith('.ogg'));
  }

  function StreamLoading() {
    return (
      <div className="aspect-video flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.15)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
          <div className="w-16 h-16 rounded-full absolute inset-0" style={{ border: '2px solid transparent', borderBottom: '2px solid rgba(167,139,250,0.4)', animation: 'spinLoader 1.4s linear infinite reverse' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Loading stream...</p>
        <div className="flex gap-1.5 mt-3">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'preloaderBounce 0.7s ease-in-out infinite', animationDelay: (i * 0.15) + 's' }} />
          ))}
        </div>
      </div>
    );
  }

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
        setStreamUrl('');
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
      const fn = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' && prevEpisode && !e.ctrlKey) navigate('/watch/' + animeId + '/' + prevEpisode.id);
        if (e.key === 'ArrowRight' && nextEpisode && !e.ctrlKey) navigate('/watch/' + animeId + '/' + nextEpisode.id);
      };
      window.addEventListener('keydown', fn);
      return () => window.removeEventListener('keydown', fn);
    }, [prevEpisode, nextEpisode, navigate, animeId]);

    const episodeNumber = currentEpisode?.number || currentEpisodeIndex + 1;
    const pageTitle = anime?.title ? anime.title + ' - Episode ' + episodeNumber + ' - ToxiNime' : 'Watch Anime - ToxiNime';
    const posterImage = anime?.image_cover || anime?.imageCover || anime?.poster || anime?.thumbnail;

    if (loading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen pt-24 flex items-center justify-center" style={{ background: '#0f1117' }}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.15)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading anime...</p>
            </div>
          </main>
        </>
      );
    }

    if (error) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen pt-20" style={{ background: '#0f1117' }}>
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
              <EmptyState type="error" description={error} onRetry={fetchAnimeDetail} />
              <Button asChild variant="outline" className="mt-4"><Link to="/">Back to Home</Link></Button>
            </div>
          </main>
        </>
      );
    }

    const isEmbed = isEmbedType(streamUrl);
    const iframeSrc = isEmbed ? buildIframeSrc(streamUrl) : '';
    const isValid = streamUrl && (streamUrl.startsWith('http://') || streamUrl.startsWith('https://'));

    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={'Watch ' + (anime?.title || 'anime') + ' Episode ' + episodeNumber + ' free on ToxiNime.'} />
        </Helmet>
        <Navbar />
        <main className="min-h-screen pb-16" style={{ background: '#0f1117', paddingTop: 72 }}>
          <div className="max-w-5xl mx-auto px-4">
            <Link to={'/anime/' + animeId} className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            >
              <ChevronLeft className="w-4 h-4" /> {anime?.title}
            </Link>

            <div className="mb-5">
              {streamLoading ? (
                <StreamLoading />
              ) : streamError || !isValid ? (
                <div className="aspect-video flex flex-col items-center justify-center p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
                  <AlertCircle className="w-12 h-12 mb-4" style={{ color: '#f87171' }} />
                  <h3 className="text-base font-bold mb-2">Failed to load video</h3>
                  <p className="text-sm mb-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{streamError || 'Invalid stream URL'}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={fetchStream} style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>Try Again</Button>
                    <Button onClick={() => setQuality(quality === 'HD' ? 'SD' : 'HD')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      Try {quality === 'HD' ? 'SD' : 'HD'}
                    </Button>
                    {streamUrl && (
                      <a href={streamUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                      >
                        <ExternalLink className="w-4 h-4" /> Open in New Tab
                      </a>
                    )}
                  </div>
                </div>
              ) : isEmbed ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9', background: '#000' }}>
                  <iframe
                    key={iframeSrc}
                    src={iframeSrc}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
                    title={(anime?.title || 'Anime') + ' Episode ' + episodeNumber}
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <VideoPlayer src={streamUrl} poster={posterImage} title={'Episode ' + episodeNumber} onQualityChange={setQuality} qualities={['HD', 'SD']} currentQuality={quality} />
                </div>
              )}

              {!streamLoading && !streamError && isValid && isEmbed && (
                <div className="flex justify-end mt-2">
                  <a href={streamUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in new tab if video doesn't load
                  </a>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold truncate" style={{ color: '#e2e8f0' }}>{anime?.title}</h1>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#a78bfa' }}>
                    Episode {episodeNumber}{currentEpisode?.title ? ' — ' + currentEpisode.title : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowEpisodes(!showEpisodes)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    <List className="w-4 h-4" /> Episodes
                  </button>
                  <button
                    disabled={!prevEpisode}
                    onClick={() => prevEpisode && navigate('/watch/' + animeId + '/' + prevEpisode.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button
                    disabled={!nextEpisode}
                    onClick={() => nextEpisode && navigate('/watch/' + animeId + '/' + nextEpisode.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 shadow-glow-sm"
                    style={{ background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showEpisodes && episodes.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    All Episodes ({episodes.length})
                  </p>
                  <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-52 overflow-y-auto scrollbar-hide">
                    {episodes.map((ep: Episode) => (
                      <button
                        key={ep.id}
                        onClick={() => navigate('/watch/' + animeId + '/' + ep.id)}
                        className={cn('py-2 px-1 rounded-xl text-xs font-bold text-center transition-all duration-200 font-mono-nums', ep.id === episodeId ? 'shadow-glow-sm' : '')}
                        style={ep.id === episodeId
                          ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.07)' }
                        }
                      >
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
  