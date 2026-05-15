import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, List, AlertCircle, RefreshCw, SkipForward, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { VideoPlayer } from '@/components/VideoPlayer';
import { mobinime, type AnimeItem, type Episode } from '@/services/mobinime';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { cn } from '@/lib/utils';

function isDirectStream(url: string): boolean {
  if (!url) return false;
  const l = url.toLowerCase();
  return l.includes('.m3u8') || l.endsWith('.mp4') || l.endsWith('.webm') || l.includes('/hls/');
}

function StreamSpinner() {
  return (
    <div className="aspect-video flex flex-col items-center justify-center gap-4 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-16 h-16 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.12)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.85s linear infinite' }} />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Loading stream...</p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'preloaderBounce 0.7s ease-in-out infinite', animationDelay: (i*.15)+'s' }} />
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeEpRef = useRef<HTMLButtonElement>(null);

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [animeLoading, setAnimeLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(true);
  const [animeError, setAnimeError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [quality, setQuality] = useState('HD');
  const [showSidebar, setShowSidebar] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchStream = useCallback(async (q = quality, ep = episodeId) => {
    if (!animeId || !ep) return;
    setStreamLoading(true); setStreamError(null); setStreamUrl('');
    try {
      const url = await mobinime.stream(animeId, ep, { quality: q });
      setStreamUrl(url);
    } catch (err: unknown) {
      setStreamError(err instanceof Error ? err.message : 'Failed to get stream');
    } finally {
      setStreamLoading(false);
    }
  }, [animeId, episodeId, quality]);

  useEffect(() => {
    if (!animeId || !episodeId) return;
    setAnimeLoading(true); setAnimeError(null);
    setStreamLoading(true); setStreamError(null); setStreamUrl('');
    setRetryCount(0);

    mobinime.detail(animeId)
      .then(d => setAnime(d))
      .catch(e => setAnimeError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setAnimeLoading(false));

    mobinime.stream(animeId, episodeId, { quality })
      .then(url => setStreamUrl(url))
      .catch(e => setStreamError(e instanceof Error ? e.message : 'Failed to get stream'))
      .finally(() => setStreamLoading(false));
  }, [animeId, episodeId]);

  useEffect(() => {
    if (!anime || !animeId || !episodeId || streamLoading || streamError) return;
    const eps = [...(anime.episodes || [])].sort((a, b) => (a.number||0) - (b.number||0));
    const cur = eps.find(e => e.id === episodeId);
    const epNum = cur?.number || (eps.findIndex(e => e.id === episodeId) + 1);
    const poster = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail;
    save({ animeId, episodeId, episodeNumber: epNum, animeTitle: anime.title, poster });
  }, [anime, animeId, episodeId, streamLoading, streamError, save]);

  useEffect(() => {
    if (activeEpRef.current && sidebarRef.current) {
      activeEpRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [anime, episodeId, showSidebar]);

  useEffect(() => {
    const eps = [...(anime?.episodes || [])].sort((a,b) => (a.number||0) - (b.number||0));
    const idx = eps.findIndex(e => e.id === episodeId);
    const prev = eps[idx - 1]; const next = eps[idx + 1];
    const fn = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && prev) navigate('/watch/' + animeId + '/' + encodeURIComponent(prev.id));
      if (e.key === 'ArrowRight' && next) navigate('/watch/' + animeId + '/' + encodeURIComponent(next.id));
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [anime, episodeId, navigate, animeId]);

  const episodes = [...(anime?.episodes || [])].sort((a,b) => (a.number||0) - (b.number||0));
  const idx = episodes.findIndex(e => e.id === episodeId);
  const currentEpisode = episodes[idx];
  const prevEpisode = episodes[idx - 1];
  const nextEpisode = episodes[idx + 1];
  const episodeNumber = currentEpisode?.number || idx + 1;
  const posterImage = anime?.image_cover || anime?.imageCover || anime?.poster || anime?.thumbnail;

  const goTo = (ep: Episode) => navigate('/watch/' + animeId + '/' + encodeURIComponent(ep.id));

  if (animeLoading && streamLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a12', paddingTop: 80 }}>
          <StreamSpinner />
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{anime?.title ? anime.title + ' — Episode ' + episodeNumber + ' | ToxiNime' : 'Watch | ToxiNime'}</title>
      </Helmet>
      <Navbar />

      <main className="min-h-screen pb-16" style={{ background: '#0a0a12', paddingTop: 64 }}>
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-3">
          <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            {anime && <Link to={'/anime/' + animeId} className="hover:text-white transition-colors truncate max-w-[200px]">{anime.title}</Link>}
            <ChevronRight className="w-3.5 h-3.5" />
            <span style={{ color: '#a78bfa' }}>Episode {episodeNumber}</span>
          </div>

          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1 min-w-0">
              {streamLoading ? (
                <StreamSpinner />
              ) : streamError || !streamUrl ? (
                <div className="aspect-video flex flex-col items-center justify-center p-6 text-center rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <AlertCircle className="w-12 h-12 mb-3" style={{ color: '#f87171' }} />
                  <h3 className="font-bold text-base mb-2" style={{ color: '#e2e8f0' }}>Stream unavailable</h3>
                  <p className="text-sm mb-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {streamError || 'No stream URL found'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => { setRetryCount(r => r+1); fetchStream('HD'); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>
                      <RefreshCw className="w-4 h-4" /> Retry HD
                    </button>
                    <button onClick={() => fetchStream('SD')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      Try SD
                    </button>
                    {prevEpisode && (
                      <button onClick={() => goTo(prevEpisode)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                        <ChevronLeft className="w-4 h-4" /> Prev Ep
                      </button>
                    )}
                    {nextEpisode && (
                      <button onClick={() => goTo(nextEpisode)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                        Next Ep <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {retryCount >= 2 && (
                    <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Stream may be unavailable for this episode. Try a different episode or come back later.
                    </p>
                  )}
                </div>
              ) : isDirectStream(streamUrl) ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <VideoPlayer
                    src={streamUrl}
                    poster={posterImage}
                    title={'Ep ' + episodeNumber + (currentEpisode?.title ? ' — ' + currentEpisode.title : '') + (anime ? ' · ' + anime.title : '')}
                    onQualityChange={q => { setQuality(q); fetchStream(q); }}
                    qualities={['HD', 'SD']}
                    currentQuality={quality}
                    onNext={nextEpisode ? () => goTo(nextEpisode) : undefined}
                    onPrev={prevEpisode ? () => goTo(prevEpisode) : undefined}
                    hasNext={!!nextEpisode}
                    hasPrev={!!prevEpisode}
                    onEnded={() => {}}
                  />
                </div>
              ) : (
                <div className="overflow-hidden shadow-2xl rounded-2xl" style={{ aspectRatio: '16/9', background: '#000' }}>
                  <iframe
                    key={streamUrl}
                    src={streamUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    title={(anime?.title || 'Anime') + ' Episode ' + episodeNumber}
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  />
                </div>
              )}

              <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    {animeLoading
                      ? <div className="h-5 w-52 rounded-lg skeleton-wave mb-1" />
                      : <h1 className="text-sm font-bold truncate" style={{ color: '#e2e8f0' }}>{anime?.title}</h1>}
                    <p className="text-base font-black" style={{ color: '#a78bfa' }}>
                      Episode {episodeNumber}{currentEpisode?.title ? ' — ' + currentEpisode.title : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button onClick={() => setShowSidebar(s => !s)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium xl:hidden"
                      style={{ background: showSidebar ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: showSidebar ? '#a78bfa' : '#e2e8f0' }}>
                      <List className="w-4 h-4" /> Episodes ({episodes.length})
                    </button>
                    <button disabled={!prevEpisode} onClick={() => prevEpisode && goTo(prevEpisode)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <button disabled={!nextEpisode} onClick={() => nextEpisode && goTo(nextEpisode)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-30 transition-all"
                      style={nextEpisode ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showSidebar && episodes.length > 0 && (
                  <div className="mt-4 xl:hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                    <EpisodeGrid episodes={episodes} animeId={animeId!} currentId={episodeId} onSelect={ep => { goTo(ep); setShowSidebar(false); }} />
                  </div>
                )}
              </div>

              {anime && (
                <div className="mt-3 flex items-center gap-2">
                  <Link to={'/anime/' + animeId}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                    <ChevronLeft className="w-4 h-4" /> Back to {anime.title}
                  </Link>
                </div>
              )}
            </div>

            <div className="hidden xl:flex flex-col" style={{ width: 300, minWidth: 300 }}>
              <div className="sticky top-20 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', maxHeight: 'calc(100vh - 100px)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                    Episodes <span className="font-mono-nums" style={{ color: '#a78bfa' }}>({episodes.length})</span>
                  </h3>
                  {nextEpisode && (
                    <button onClick={() => goTo(nextEpisode)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
                      style={{ background: 'rgba(167,139,250,0.85)', color: '#0f1117' }}>
                      <SkipForward className="w-3 h-3" /> Next
                    </button>
                  )}
                </div>
                <div ref={sidebarRef} className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                  <EpisodeSidebarList
                    episodes={episodes}
                    animeId={animeId!}
                    currentId={episodeId}
                    onSelect={goTo}
                    activeRef={activeEpRef}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function EpisodeGrid({ episodes, animeId, currentId, onSelect }: {
  episodes: Episode[]; animeId: string; currentId?: string; onSelect: (ep: Episode) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? episodes : episodes.slice(0, 60);
  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {visible.map(ep => (
          <button key={ep.id} onClick={() => onSelect(ep)}
            className={cn('py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all hover:scale-105 font-mono-nums')}
            style={ep.id === currentId
              ? { background: 'rgba(167,139,250,0.85)', color: '#0f1117', border: '1px solid rgba(167,139,250,0.5)' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {ep.number ?? '?'}
          </button>
        ))}
      </div>
      {episodes.length > 60 && (
        <button onClick={() => setShowAll(s => !s)} className="mt-3 text-xs font-semibold" style={{ color: '#a78bfa' }}>
          {showAll ? 'Show less' : 'Show all ' + episodes.length + ' episodes'}
        </button>
      )}
    </div>
  );
}

function EpisodeSidebarList({ episodes, animeId, currentId, onSelect, activeRef }: {
  episodes: Episode[]; animeId: string; currentId?: string; onSelect: (ep: Episode) => void;
  activeRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <div className="space-y-1">
      {episodes.map(ep => {
        const isCurrent = ep.id === currentId;
        return (
          <button
            key={ep.id}
            ref={isCurrent ? activeRef : undefined}
            onClick={() => onSelect(ep)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
            style={isCurrent
              ? { background: 'rgba(167,139,250,0.15)', borderLeft: '2px solid #a78bfa' }
              : { borderLeft: '2px solid transparent' }
            }
          >
            <span
              className="font-mono-nums text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={isCurrent
                ? { background: 'rgba(167,139,250,0.9)', color: '#0f1117' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }
              }>
              {ep.number ?? '?'}
            </span>
            <span
              className="text-xs font-semibold truncate flex-1"
              style={{ color: isCurrent ? '#a78bfa' : 'rgba(255,255,255,0.65)' }}>
              {ep.title || 'Episode ' + ep.number}
            </span>
            {isCurrent && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#a78bfa' }} />}
          </button>
        );
      })}
    </div>
  );
}
