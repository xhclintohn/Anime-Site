import { useEffect, useRef, useState, useCallback } from 'react';
  import Hls from 'hls.js';
  import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Gauge } from 'lucide-react';
  import { cn } from '@/lib/utils';

  interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    onQualityChange?: (quality: string) => void;
    qualities?: string[];
    currentQuality?: string;
  }

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function fmtTime(t: number) {
    if (!isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    return h > 0 ? h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') : m + ':' + String(s).padStart(2,'0');
  }

  export function VideoPlayer({ src, poster, title, onQualityChange, qualities = ['HD','SD'], currentQuality = 'HD' }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ctrlTimer = useRef<ReturnType<typeof setTimeout>>();
    const tapTimer = useRef<ReturnType<typeof setTimeout>>();
    const tapCount = useRef(0);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCtrl, setShowCtrl] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [showSpeed, setShowSpeed] = useState(false);
    const [showQuality, setShowQuality] = useState(false);
    const [skipFlash, setSkipFlash] = useState<'left'|'right'|null>(null);
    const [buffered, setBuffered] = useState(0);

    useEffect(() => {
      const v = videoRef.current;
      if (!v || !src) return;
      setLoading(true); setPlaying(false);
      if (Hls.isSupported() && src.includes('.m3u8')) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        return () => hls.destroy();
      } else { v.src = src; }
    }, [src]);

    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const onTime = () => {
        setCurrentTime(v.currentTime);
        if (v.buffered.length > 0) setBuffered((v.buffered.end(v.buffered.length-1)/(v.duration||1))*100);
      };
      const events: [string, () => void][] = [
        ['timeupdate', onTime],
        ['loadedmetadata', () => { setDuration(v.duration); setLoading(false); }],
        ['play', () => setPlaying(true)],
        ['pause', () => setPlaying(false)],
        ['waiting', () => setLoading(true)],
        ['canplay', () => setLoading(false)],
      ];
      events.forEach(([e, h]) => v.addEventListener(e, h));
      const onFs = () => setFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', onFs);
      return () => { events.forEach(([e, h]) => v.removeEventListener(e, h)); document.removeEventListener('fullscreenchange', onFs); };
    }, []);

    const showBriefly = useCallback(() => {
      setShowCtrl(true);
      if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
      ctrlTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false); }, 3500);
    }, []);

    const togglePlay = useCallback(() => {
      const v = videoRef.current; if (!v) return;
      if (v.paused) v.play(); else v.pause();
      showBriefly();
    }, [showBriefly]);

    const skip = useCallback((secs: number) => {
      const v = videoRef.current; if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + secs));
      setSkipFlash(secs > 0 ? 'right' : 'left');
      setTimeout(() => setSkipFlash(null), 700);
      showBriefly();
    }, [showBriefly]);

    const handleTap = useCallback((side: 'left'|'right') => {
      tapCount.current++;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        if (tapCount.current >= 2) skip(side === 'right' ? 10 : -10);
        else togglePlay();
        tapCount.current = 0;
      }, 260);
    }, [skip, togglePlay]);

    const setSpeedFn = useCallback((s: number) => {
      const v = videoRef.current; if (!v) return;
      v.playbackRate = s; setSpeed(s); setShowSpeed(false);
    }, []);

    const toggleFs = useCallback(async () => {
      const c = containerRef.current; if (!c) return;
      if (!document.fullscreenElement) {
        await c.requestFullscreen().catch(() => {});
        try {
          const ori = screen.orientation as unknown as { lock: (o: string) => Promise<void> };
          await ori.lock('portrait').catch(() => {});
        } catch { }
      } else {
        await document.exitFullscreen().catch(() => {});
        try { (screen.orientation as unknown as { unlock: () => void }).unlock(); } catch { }
      }
    }, []);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div
        ref={containerRef}
        className={cn('relative bg-black overflow-hidden select-none', fullscreen ? 'w-screen h-screen rounded-none' : 'aspect-video rounded-2xl')}
        onMouseMove={showBriefly}
        onMouseLeave={() => { if (playing) setShowCtrl(false); }}
      >
        <video ref={videoRef} poster={poster} className="w-full h-full object-contain" playsInline onClick={togglePlay} />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ background: 'rgba(15,17,23,0.75)' }}>
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full" style={{ border: '2px solid rgba(167,139,250,0.15)', borderTop: '2px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Roboto, sans-serif' }}>Loading video...</p>
            <div className="flex gap-1.5 mt-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'preloaderBounce 0.65s ease-in-out infinite', animationDelay: (i*0.15) + 's' }} />
              ))}
            </div>
          </div>
        )}

        {!playing && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center justify-center badge-pulse" style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(167,139,250,0.88)' }}>
              <Play className="w-8 h-8 fill-white text-white" style={{ marginLeft: 4 }} />
            </div>
          </div>
        )}

        <div className="absolute left-0 top-0 w-1/2 h-full z-20 cursor-pointer" onTouchStart={() => handleTap('left')} onClick={togglePlay} />
        <div className="absolute right-0 top-0 w-1/2 h-full z-20 cursor-pointer" onTouchStart={() => handleTap('right')} onClick={togglePlay} />

        {skipFlash && (
          <div className={cn('absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none', skipFlash === 'left' ? 'left-5' : 'right-5')}>
            <div className="w-14 h-14 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
              {skipFlash === 'left' ? <RotateCcw className="w-7 h-7 text-white" /> : <RotateCw className="w-7 h-7 text-white" />}
            </div>
            <span className="text-white text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', fontFamily: 'JetBrains Mono, monospace' }}>
              {skipFlash === 'left' ? '−' : '+'}10s
            </span>
          </div>
        )}

        <div className={cn('absolute inset-0 flex flex-col justify-end z-25 pointer-events-none transition-opacity duration-300', showCtrl ? 'opacity-100' : 'opacity-0')}>
          <div className="pointer-events-auto" style={{ background: 'linear-gradient(to top, rgba(15,17,23,0.98) 0%, rgba(15,17,23,0.5) 60%, transparent 100%)', padding: '48px 16px 14px' }}>
            {title && <p className="text-xs mb-2 line-clamp-1" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Roboto, sans-serif' }}>{title}</p>}

            <div
              className="relative h-1 rounded-full mb-4 cursor-pointer group/seek"
              style={{ background: 'rgba(255,255,255,0.18)' }}
              onClick={(e) => {
                const v = videoRef.current; if (!v || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
              }}
            >
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: buffered + '%', background: 'rgba(255,255,255,0.25)' }} />
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: progress + '%', background: '#a78bfa' }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover/seek:opacity-100 transition-opacity" style={{ left: 'calc(' + progress + '% - 6px)', background: '#a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.7)' }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10">
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button onClick={() => skip(-10)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10" title="-10s">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => skip(10)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10" title="+10s">
                  <RotateCw className="w-4 h-4" />
                </button>
                <button onClick={() => { const v = videoRef.current; if(!v) return; v.muted = !muted; setMuted(!muted); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-[11px] ml-1 font-mono-nums hidden sm:inline" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <div className="relative">
                  <button onClick={() => { setShowSpeed(!showSpeed); setShowQuality(false); }}
                    className="flex items-center gap-1 h-8 px-2 rounded-lg text-white text-xs font-bold transition-colors hover:bg-white/10">
                    <Gauge className="w-3.5 h-3.5" /><span className="hidden sm:inline">{speed}×</span>
                  </button>
                  {showSpeed && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-xl p-1.5 min-w-[90px] z-50 shadow-2xl" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-[9px] px-2 mb-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Speed</p>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => setSpeedFn(s)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg text-left font-bold transition-colors"
                          style={speed===s ? {color:'#a78bfa',background:'rgba(167,139,250,0.12)'} : {color:'rgba(255,255,255,0.65)'}}>
                          {s === 1 ? '1× Normal' : s + '×'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button onClick={() => { setShowQuality(!showQuality); setShowSpeed(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-[10px] font-bold transition-colors hover:bg-white/10">
                    {currentQuality}
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-xl p-1.5 min-w-[80px] z-50 shadow-2xl" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {qualities.map(q => (
                        <button key={q} onClick={() => { onQualityChange?.(q); setShowQuality(false); }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg text-left font-bold transition-colors"
                          style={currentQuality===q ? {color:'#a78bfa',background:'rgba(167,139,250,0.12)'} : {color:'rgba(255,255,255,0.65)'}}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={toggleFs} className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10">
                  {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  