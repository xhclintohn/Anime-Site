import { useEffect, useState, useCallback } from 'react';
  import { useParams, Link, useNavigate } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { ChevronLeft, ChevronRight, List, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { VideoPlayer } from '@/components/VideoPlayer';
  import { EmptyState } from '@/components/EmptyState';
  import { Button } from '@/components/ui/button';
  import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { cn } from '@/lib/utils';

  function isEmbedType(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Direct playable formats — use VideoPlayer + HLS.js
    if (lower.includes('.m3u8') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.includes('/hls/')) return false;
    // Embed pages
    return lower.includes('/embed') || lower.includes('/player') || lower.includes('watch?') || !lower.includes('.');
  }

  function StreamSpinner() {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
        <div className="relative">
          <div className="w-16 h-16 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.12)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.85s linear infinite' }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Loading stream...</p>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'preloaderBounce 0.7s ease-in-out infinite', animationDelay: (i * 0.15) + 's' }} />
            ))}
          </div>
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
    const [animeLoading, setAnimeLoading] = useState(true);
    const [streamLoading, setStreamLoading] = useState(true);
    const [animeError, setAnimeError] = useState<string | null>(null);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [quality, setQuality] = useState<string>('HD');
    const [showEpisodes, setShowEpisodes] = useState(false);

    const fetchStream = useCallback(async (q = quality) => {
      if (!animeId || !episodeId) return;
      setStreamLoading(true);
      setStreamError(null);
      setStreamUrl('');
      try {
        const url = await mobinime.stream(animeId, episodeId, { quality: q });
        setStreamUrl(url);
      } catch (err: unknown) {
        setStreamError(err instanceof Error ? err.message : 'Failed to get stream');
      } finally {
        setStreamLoading(false);
      }
    }, [animeId, episodeId, quality]);

    // Load anime detail and stream in parallel
    useEffect(() => {
      if (!animeId || !episodeId) return;
      setAnimeLoading(true); setAnimeError(null);
      setStreamLoading(true); setStreamError(null); setStreamUrl('');

      // Parallel: detail + stream
      mobinime.detail(animeId)
        .then(data => setAnime(data))
        .catch(err => setAnimeError(err instanceof Error ? err.message : 'Failed to load'))
        .finally(() => setAnimeLoading(false));

      mobinime.stream(animeId, episodeId, { quality })
        .then(url => setStreamUrl(url))
        .catch(err => setStreamError(err instanceof Error ? err.message : 'Failed to get stream'))
        .finally(() => setStreamLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId, episodeId]);

    // Save watch history when stream is ready
    useEffect(() => {
      if (!anime || !animeId || !episodeId || streamLoading || streamError) return;
      const episodes = [...(anime.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
      const currentEp = episodes.find(ep => ep.id === episodeId);
      const epNumber = currentEp?.number || (episodes.findIndex(ep => ep.id === episodeId) + 1);
      const poster = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail;
      save({ animeId, episodeId, episodeNumber: epNumber, animeTitle: anime.title, poster });
    }, [anime, animeId, episodeId, streamLoading, streamError, save]);

    // Keyboard navigation
    useEffect(() => {
      const episodes = [...(anime?.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
      const idx = episodes.findIndex(ep => ep.id === episodeId);
      const prev = episodes[idx - 1]; const next = episodes[idx + 1];
      const fn = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.altKey) return;
        if (e.key === 'ArrowLeft' && prev) navigate('/watch/' + animeId + '/' + prev.id);
        if (e.key === 'ArrowRight' && next) navigate('/watch/' + animeId + '/' + next.id);
      };
      window.addEventListener('keydown', fn);
      return () => window.removeEventListener('keydown', fn);
    }, [anime, episodeId, navigate, animeId]);

    const episodes = [...(anime?.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
    const idx = episodes.findIndex(ep => ep.id === episodeId);
    const currentEpisode = episodes[idx];
    const prevEpisode = episodes[idx - 1];
    const nextEpisode = episodes[idx + 1];
    const episodeNumber = currentEpisode?.number || idx + 1;
    const posterImage = anime?.image_cover || anime?.imageCover || anime?.poster || anime?.thumbnail;

    const isEmbed = isEmbedType(streamUrl);
    const iframeSrc = isEmbed ? '/api/embed-proxy?url=' + encodeURIComponent(streamUrl) : '';
    const isValidUrl = streamUrl && (streamUrl.startsWith('http://') || streamUrl.startsWith('https://'));

    if (animeLoading && streamLoading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117', paddingTop: 80 }}>
            <StreamSpinner />
          </main>
        </>
      );
    }

    return (
      <>
        <Helmet>
          <title>{anime?.title ? anime.title + ' - Episode ' + episodeNumber + ' - ToxiNime' : 'Watch Anime - ToxiNime'}</title>
        </Helmet>
        <Navbar />
        <main className="min-h-screen pb-16" style={{ background: '#0f1117', paddingTop: 72 }}>
          <div className="max-w-5xl mx-auto px-4">
            <Link to={'/anime/' + animeId} className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <ChevronLeft className="w-4 h-4" /> {anime?.title || 'Back'}
            </Link>

            <div className="mb-5">
              {streamLoading ? (
                <StreamSpinner />
              ) : streamError || !isValidUrl ? (
                <div className="aspect-video flex flex-col items-center justify-center p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
                  <AlertCircle className="w-12 h-12 mb-3" style={{ color: '#f87171' }} />
                  <h3 className="font-bold text-base mb-2">Couldn't load video</h3>
                  <p className="text-sm mb-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{streamError || 'Invalid stream URL'}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => fetchStream('HD')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-glow-sm"
                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>
                      <RefreshCw className="w-4 h-4" /> Retry HD
                    </button>
                    <button onClick={() => fetchStream('SD')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      Try SD
                    </button>
                    {prevEpisode && (
                      <button onClick={() => navigate('/watch/' + animeId + '/' + prevEpisode.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                        <ChevronLeft className="w-4 h-4" /> Prev Ep
                      </button>
                    )}
                    {nextEpisode && (
                      <button onClick={() => navigate('/watch/' + animeId + '/' + nextEpisode.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                        Next Ep <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : isEmbed ? (
                <div className="overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9', borderRadius: 16, background: '#000' }}>
                  <iframe
                    key={iframeSrc}
                    src={iframeSrc}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    title={(anime?.title || 'Anime') + ' Episode ' + episodeNumber}
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  />
                </div>
              ) : (
                <div className="shadow-2xl" style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <VideoPlayer
                    src={streamUrl}
                    poster={posterImage}
                    title={'Episode ' + episodeNumber + (currentEpisode?.title ? ' — ' + currentEpisode.title : '')}
                    onQualityChange={(q) => { setQuality(q); fetchStream(q); }}
                    qualities={['HD', 'SD']}
                    currentQuality={quality}
                  />
                </div>
              )}

              {!streamLoading && isValidUrl && isEmbed && (
                <div className="flex justify-end mt-2">
                  <a href={streamUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in new tab if not loading
                  </a>
                </div>
              )}
            </div>

            {/* Episode info and nav */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="min-w-0">
                  {animeLoading
                    ? <div className="h-5 w-48 rounded-lg skeleton-wave mb-1" />
                    : <h1 className="text-base font-bold truncate" style={{ color: '#e2e8f0' }}>{anime?.title}</h1>}
                  <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>
                    Episode {episodeNumber}{currentEpisode?.title ? ' — ' + currentEpisode.title : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setShowEpisodes(!showEpisodes)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                    <List className="w-4 h-4" /> Episodes
                  </button>
                  <button disabled={!prevEpisode}
                    onClick={() => prevEpisode && navigate('/watch/' + animeId + '/' + prevEpisode.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-35"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button disabled={!nextEpisode}
                    onClick={() => nextEpisode && navigate('/watch/' + animeId + '/' + nextEpisode.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-35 shadow-glow-sm"
                    style={{ background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.4)' }}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showEpisodes && episodes.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>All Episodes ({episodes.length})</p>
                  <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-44 overflow-y-auto scrollbar-hide">
                    {episodes.map((ep: Episode) => (
                      <button key={ep.id}
                        onClick={() => navigate('/watch/' + animeId + '/' + ep.id)}
                        className={cn('py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all font-mono-nums', ep.id === episodeId ? 'shadow-glow-sm' : '')}
                        style={ep.id === episodeId
                          ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)' }
                        }
                      >{ep.number || '?'}</button>
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
  