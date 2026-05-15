import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Gauge, PictureInPicture, SkipForward, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onQualityChange?: (quality: string) => void;
  qualities?: string[];
  currentQuality?: string;
  onEnded?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const AUTO_NEXT_DELAY = 10;

function fmtTime(t: number) {
  if (!isFinite(t) || t < 0) return '0:00';
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function enterFs(el: HTMLElement) {
  const e = el as HTMLElement & { webkitRequestFullscreen?(): Promise<void>; mozRequestFullScreen?(): Promise<void>; };
  return e.requestFullscreen?.() ?? e.webkitRequestFullscreen?.() ?? e.mozRequestFullScreen?.();
}
function exitFs() {
  const d = document as Document & { webkitExitFullscreen?(): Promise<void>; mozCancelFullScreen?(): Promise<void>; };
  return d.exitFullscreen?.() ?? d.webkitExitFullscreen?.() ?? d.mozCancelFullScreen?.();
}
function isFs() {
  const d = document as Document & { webkitFullscreenElement?: Element | null; mozFullScreenElement?: Element | null; };
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement ?? d.mozFullScreenElement);
}

export function VideoPlayer({ src, poster, title, onQualityChange, qualities = ['HD','SD'], currentQuality = 'HD', onEnded, onNext, onPrev, hasNext = false, hasPrev = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlTimer = useRef<ReturnType<typeof setTimeout>>();
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownTimer = useRef<ReturnType<typeof setInterval>>();
  const tapSide = useRef<'left'|'right'|null>(null);
  const tapCount = useRef(0);
  const lastWasTouch = useRef(false);

  const [playing, setPlaying]     = useState(false);
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [showCtrl, setShowCtrl]   = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [speed, setSpeed]         = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [skipFlash, setSkipFlash] = useState<'left'|'right'|null>(null);
  const [buffered, setBuffered]   = useState(0);
  const [ended, setEnded]         = useState(false);
  const [countdown, setCountdown] = useState(AUTO_NEXT_DELAY);
  const [pip, setPip]             = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    setLoading(true); setPlaying(false); setEnded(false); setCountdown(AUTO_NEXT_DELAY);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    let hls: Hls | null = null;
    if (Hls.isSupported() && (src.includes('.m3u8') || src.includes('/hls/'))) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); v.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e: unknown, d: { fatal: boolean }) => { if (d.fatal) setLoading(false); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl') && src.includes('.m3u8')) {
      v.src = src;
      setLoading(false);
    } else {
      v.src = src;
      setLoading(false);
    }
    return () => hls?.destroy();
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime  = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length-1) / (v.duration||1) * 100);
    };
    const onMeta  = () => { setDuration(v.duration); setLoading(false); };
    const onPlay  = () => { setPlaying(true); setEnded(false); };
    const onPause = () => setPlaying(false);
    const onWait  = () => setLoading(true);
    const onCan   = () => setLoading(false);
    const onFs    = () => setFullscreen(isFs());
    const onPipEnter = () => setPip(true);
    const onPipExit  = () => setPip(false);
    const onEnd   = () => {
      setPlaying(false); setEnded(true);
      if (onEnded) onEnded();
      if (onNext && hasNext) {
        let c = AUTO_NEXT_DELAY;
        setCountdown(c);
        countdownTimer.current = setInterval(() => {
          c -= 1;
          setCountdown(c);
          if (c <= 0) {
            if (countdownTimer.current) clearInterval(countdownTimer.current);
            onNext();
          }
        }, 1000);
      }
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWait);
    v.addEventListener('canplay', onCan);
    v.addEventListener('ended', onEnd);
    v.addEventListener('enterpictureinpicture', onPipEnter);
    v.addEventListener('leavepictureinpicture', onPipExit);
    v.addEventListener('webkitbeginfullscreen', () => setFullscreen(true));
    v.addEventListener('webkitendfullscreen',   () => setFullscreen(false));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWait); v.removeEventListener('canplay', onCan);
      v.removeEventListener('ended', onEnd);
      v.removeEventListener('enterpictureinpicture', onPipEnter);
      v.removeEventListener('leavepictureinpicture', onPipExit);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, [onEnded, onNext, hasNext]);

  const showBriefly = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false); }, 3500);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
    showBriefly();
  }, [showBriefly]);

  const skip = useCallback((secs: number) => {
    const v = videoRef.current; if (!v || !v.duration) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
    setSkipFlash(secs > 0 ? 'right' : 'left');
    setTimeout(() => setSkipFlash(null), 700);
    showBriefly();
  }, [showBriefly]);

  const setSpeedFn = useCallback((s: number) => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = s; setSpeed(s); setShowSpeed(false);
  }, []);

  const toggleFs = useCallback(() => {
    const c = containerRef.current; const v = videoRef.current;
    if (!c) return;
    if (!isFs()) {
      const p = enterFs(c);
      if (p) {
        p.then(() => {
          try { (screen.orientation as unknown as { lock(o: string): Promise<void> }).lock('landscape'); } catch {}
        }).catch(() => {
          const vi = v as HTMLVideoElement & { webkitEnterFullscreen?(): void };
          if (vi?.webkitEnterFullscreen) vi.webkitEnterFullscreen();
        });
      } else {
        const vi = v as HTMLVideoElement & { webkitEnterFullscreen?(): void };
        if (vi?.webkitEnterFullscreen) vi.webkitEnterFullscreen();
      }
    } else {
      exitFs()?.catch(() => {});
      try { (screen.orientation as { unlock(): void }).unlock(); } catch {}
    }
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current; if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setEnded(false); setCountdown(AUTO_NEXT_DELAY);
  }, []);

  const fireTap = useCallback((side: 'left'|'right') => {
    tapSide.current = side; tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      const count = tapCount.current, s = tapSide.current;
      tapCount.current = 0; tapSide.current = null;
      if (count >= 2) skip(s === 'right' ? 10 : -10); else togglePlay();
    }, 260);
  }, [skip, togglePlay]);

  const handleTouchStart = (side: 'left'|'right') => (e: React.TouchEvent) => {
    e.preventDefault(); lastWasTouch.current = true; fireTap(side);
  };
  const handleClick = () => {
    if (lastWasTouch.current) { lastWasTouch.current = false; return; }
    togglePlay(); showBriefly();
  };

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
    showBriefly();
  }, [duration, showBriefly]);

  const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current; if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0] || e.changedTouches[0];
    v.currentTime = Math.max(0, Math.min(duration, ((t.clientX - rect.left) / rect.width) * duration));
    showBriefly();
  }, [duration, showBriefly]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    const next = !muted; v.muted = next; setMuted(next);
    if (!next && volume === 0) { v.volume = 1; setVolume(1); }
  }, [muted, volume]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current; if (!v) return;
    const vol = Number(e.target.value); v.volume = vol; v.muted = vol === 0;
    setVolume(vol); setMuted(vol === 0);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black overflow-hidden select-none', fullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'aspect-video rounded-2xl')}
      onMouseMove={showBriefly}
      onMouseLeave={() => { if (playing) setShowCtrl(false); }}
    >
      <video ref={videoRef} poster={poster} className="w-full h-full object-contain" playsInline preload="metadata" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none" style={{ background: 'rgba(8,8,16,0.85)' }}>
          <div className="w-14 h-14 rounded-full mb-3" style={{ border: '3px solid rgba(167,139,250,0.15)', borderTop: '3px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading stream...</p>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'preloaderBounce 0.65s ease-in-out infinite', animationDelay: (i*.15)+'s' }} />)}
          </div>
        </div>
      )}

      {!playing && !loading && !ended && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(167,139,250,0.88)', boxShadow: '0 0 32px rgba(167,139,250,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play className="w-8 h-8 fill-white text-white" style={{ marginLeft: 5 }} />
          </div>
        </div>
      )}

      {ended && hasNext && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(8,8,16,0.82)', backdropFilter: 'blur(6px)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Up next in {countdown}s</p>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(167,139,250,0.15)', border: '2px solid rgba(167,139,250,0.4)' }}>
            <SkipForward className="w-7 h-7" style={{ color: '#a78bfa' }} />
          </div>
          <p className="text-base font-bold mb-5" style={{ color: '#e2e8f0' }}>Next Episode</p>
          <div className="flex gap-3">
            <button onClick={cancelCountdown}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>
              Cancel
            </button>
            <button onClick={() => { cancelCountdown(); onNext?.(); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(167,139,250,0.9)', color: '#0f1117' }}>
              <SkipForward className="w-4 h-4" /> Play Now
            </button>
          </div>
        </div>
      )}

      {skipFlash && (
        <div className={cn('absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none', skipFlash === 'left' ? 'left-6' : 'right-6')}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {skipFlash === 'left' ? <RotateCcw className="w-6 h-6 text-white" /> : <RotateCw className="w-6 h-6 text-white" />}
          </div>
          <span className="text-white text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-nums" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {skipFlash === 'left' ? '−10s' : '+10s'}
          </span>
        </div>
      )}

      <div className="absolute left-0 top-0 h-full z-20 cursor-pointer" style={{ width: '50%' }} onTouchStart={handleTouchStart('left')} onClick={handleClick} />
      <div className="absolute right-0 top-0 h-full z-20 cursor-pointer" style={{ width: '50%' }} onTouchStart={handleTouchStart('right')} onClick={handleClick} />

      <div className={cn('absolute inset-0 flex flex-col justify-between z-25 pointer-events-none transition-opacity duration-300', showCtrl ? 'opacity-100' : 'opacity-0')}>
        <div className="pointer-events-auto flex items-center justify-between px-3 pt-3 pb-8"
          style={{ background: 'linear-gradient(to bottom,rgba(8,8,16,0.85),transparent)' }}>
          <div className="flex items-center gap-2">
            {hasPrev && onPrev && (
              <button onTouchEnd={e=>{e.preventDefault();onPrev();}} onClick={onPrev}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasNext && onNext && (
              <button onTouchEnd={e=>{e.preventDefault();onNext();}} onClick={onNext}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(167,139,250,0.8)', color: '#0f1117' }}>
                Next <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-auto" style={{ background: 'linear-gradient(to top,rgba(8,8,16,0.98) 0%,rgba(8,8,16,0.55) 55%,transparent 100%)', padding: '48px 14px 12px' }}>
          {title && <p className="text-xs mb-2 line-clamp-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{title}</p>}

          <div className="relative h-1.5 rounded-full mb-3 cursor-pointer group/seek" style={{ background: 'rgba(255,255,255,0.18)' }}
            onClick={handleSeek} onTouchMove={handleSeekTouch}>
            <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none" style={{ width: buffered+'%', background: 'rgba(255,255,255,0.28)' }} />
            <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none" style={{ width: progress+'%', background: 'linear-gradient(to right,#818cf8,#a78bfa)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none opacity-0 group-hover/seek:opacity-100"
              style={{ left: 'calc('+progress+'% - 8px)', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.9)' }} />
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <button onTouchEnd={e=>{e.preventDefault();togglePlay();}} onClick={()=>{if(!lastWasTouch.current)togglePlay();lastWasTouch.current=false;}}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors">
                {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
              <button onTouchEnd={e=>{e.preventDefault();skip(-10);}} onClick={()=>skip(-10)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors" title="−10s">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onTouchEnd={e=>{e.preventDefault();skip(10);}} onClick={()=>skip(10)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors" title="+10s">
                <RotateCw className="w-4 h-4" />
              </button>
              <button onClick={toggleMute}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors hidden sm:flex">
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolume}
                className="w-16 hidden sm:block" style={{ accentColor: '#a78bfa' }} />
              <span className="text-[11px] font-mono-nums ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {fmtTime(currentTime)}<span className="hidden sm:inline"> / {fmtTime(duration)}</span>
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              <div className="relative">
                <button onClick={()=>{setShowSpeed(s=>!s);setShowQuality(false);}}
                  className="flex items-center gap-1 h-9 px-2 rounded-xl text-white text-xs font-bold hover:bg-white/10 transition-colors">
                  <Gauge className="w-3.5 h-3.5" /><span className="hidden sm:inline font-mono-nums">{speed}×</span>
                </button>
                {showSpeed && (
                  <div className="absolute bottom-full right-0 mb-2 rounded-2xl p-1.5 shadow-2xl z-50" style={{ background:'rgba(12,12,22,0.97)', border:'1px solid rgba(255,255,255,0.1)', minWidth:100 }}>
                    <p className="text-[9px] px-2 pt-1 pb-0.5 uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.28)' }}>Speed</p>
                    {SPEEDS.map(s => (
                      <button key={s} onClick={()=>setSpeedFn(s)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl text-left font-bold font-mono-nums"
                        style={speed===s ? {color:'#a78bfa',background:'rgba(167,139,250,0.12)'} : {color:'rgba(255,255,255,0.6)'}}>
                        {s===1?'1× Normal':s+'×'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={()=>{setShowQuality(q=>!q);setShowSpeed(false);}}
                  className="h-9 px-2 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-colors tracking-wide">
                  {currentQuality}
                </button>
                {showQuality && (
                  <div className="absolute bottom-full right-0 mb-2 rounded-2xl p-1.5 shadow-2xl z-50" style={{ background:'rgba(12,12,22,0.97)', border:'1px solid rgba(255,255,255,0.1)', minWidth:80 }}>
                    {qualities.map(q => (
                      <button key={q} onClick={()=>{onQualityChange?.(q);setShowQuality(false);}}
                        className="w-full px-3 py-1.5 text-xs rounded-xl text-left font-bold"
                        style={currentQuality===q ? {color:'#a78bfa',background:'rgba(167,139,250,0.12)'} : {color:'rgba(255,255,255,0.6)'}}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {pipSupported && (
                <button
                  onTouchEnd={e=>{e.preventDefault();togglePip();}} onClick={togglePip}
                  className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                  title="Picture-in-Picture">
                  <PictureInPicture className={cn('w-4 h-4', pip ? 'text-purple-400' : '')} />
                </button>
              )}

              <button
                onTouchEnd={e=>{e.preventDefault();toggleFs();}} onClick={toggleFs}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
