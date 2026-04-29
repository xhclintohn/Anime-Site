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
    if (!isFinite(t) || t < 0) return '0:00';
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    return h > 0
      ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
      : m + ':' + String(s).padStart(2, '0');
  }

  export function VideoPlayer({
    src, poster, title, onQualityChange,
    qualities = ['HD', 'SD'], currentQuality = 'HD',
  }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ctrlTimer = useRef<ReturnType<typeof setTimeout>>();
    const tapTimer = useRef<ReturnType<typeof setTimeout>>();
    const tapSide = useRef<'left' | 'right' | null>(null);
    const tapCount = useRef(0);
    // Track whether last interaction was touch so we skip the synthetic click
    const lastWasTouch = useRef(false);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCtrl, setShowCtrl] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [showSpeed, setShowSpeed] = useState(false);
    const [showQuality, setShowQuality] = useState(false);
    const [showVol, setShowVol] = useState(false);
    const [skipFlash, setSkipFlash] = useState<'left' | 'right' | null>(null);
    const [buffered, setBuffered] = useState(0);

    // ── HLS / src loader ──────────────────────────────────────────────────
    useEffect(() => {
      const v = videoRef.current;
      if (!v || !src) return;
      setLoading(true);
      setPlaying(false);

      let hls: Hls | null = null;
      if (Hls.isSupported() && (src.includes('.m3u8') || src.includes('/hls/'))) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setLoading(false);
        });
      } else {
        v.src = src;
        setLoading(false);
      }
      return () => { hls?.destroy(); };
    }, [src]);

    // ── Event listeners ───────────────────────────────────────────────────
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;

      const onTime = () => {
        setCurrentTime(v.currentTime);
        if (v.buffered.length > 0) {
          setBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100);
        }
      };
      const onMeta = () => { setDuration(v.duration); setLoading(false); };
      const onPlay  = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      const onWait  = () => setLoading(true);
      const onCan   = () => setLoading(false);
      const onFs    = () => setFullscreen(!!document.fullscreenElement);

      v.addEventListener('timeupdate', onTime);
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('play', onPlay);
      v.addEventListener('pause', onPause);
      v.addEventListener('waiting', onWait);
      v.addEventListener('canplay', onCan);
      document.addEventListener('fullscreenchange', onFs);

      return () => {
        v.removeEventListener('timeupdate', onTime);
        v.removeEventListener('loadedmetadata', onMeta);
        v.removeEventListener('play', onPlay);
        v.removeEventListener('pause', onPause);
        v.removeEventListener('waiting', onWait);
        v.removeEventListener('canplay', onCan);
        document.removeEventListener('fullscreenchange', onFs);
      };
    }, []);

    // ── Controls auto-hide ────────────────────────────────────────────────
    const showBriefly = useCallback(() => {
      setShowCtrl(true);
      if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
      ctrlTimer.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) setShowCtrl(false);
      }, 3500);
    }, []);

    // ── Play / pause ──────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
      showBriefly();
    }, [showBriefly]);

    // ── Skip ──────────────────────────────────────────────────────────────
    const skip = useCallback((secs: number) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
      setSkipFlash(secs > 0 ? 'right' : 'left');
      setTimeout(() => setSkipFlash(null), 700);
      showBriefly();
    }, [showBriefly]);

    // ── Speed ─────────────────────────────────────────────────────────────
    const setSpeedFn = useCallback((s: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.playbackRate = s;
      setSpeed(s);
      setShowSpeed(false);
    }, []);

    // ── Fullscreen — landscape lock on mobile ─────────────────────────────
    const toggleFs = useCallback(async () => {
      const c = containerRef.current;
      if (!c) return;
      if (!document.fullscreenElement) {
        try { await c.requestFullscreen(); } catch { /* safari fallback */ }
        // Lock landscape for proper fullscreen video on mobile
        try {
          await (screen.orientation as unknown as { lock(o: string): Promise<void> }).lock('landscape');
        } catch { /* not supported on all browsers, ignore */ }
      } else {
        try { await document.exitFullscreen(); } catch {}
        try { (screen.orientation as unknown as { unlock(): void }).unlock(); } catch {}
      }
    }, []);

    // ── Tap / click: fix the double-fire bug ──────────────────────────────
    // On mobile: touchstart fires → we set lastWasTouch = true
    //            then browser fires synthetic click → we skip it
    // On desktop: only click fires → we handle it normally

    const fireTap = useCallback((side: 'left' | 'right') => {
      tapSide.current = side;
      tapCount.current += 1;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        const count = tapCount.current;
        const s = tapSide.current;
        tapCount.current = 0;
        tapSide.current = null;
        if (count >= 2) {
          skip(s === 'right' ? 10 : -10);
        } else {
          togglePlay();
        }
      }, 280);
    }, [skip, togglePlay]);

    const handleTouchStart = useCallback((side: 'left' | 'right') => (e: React.TouchEvent) => {
      e.preventDefault(); // ← critical: stops the browser from generating a synthetic click
      lastWasTouch.current = true;
      fireTap(side);
    }, [fireTap]);

    const handleClick = useCallback((_side: 'left' | 'right') => () => {
      // Skip if this click was generated by a touch event
      if (lastWasTouch.current) {
        lastWasTouch.current = false;
        return;
      }
      togglePlay();
      showBriefly();
    }, [togglePlay, showBriefly]);

    // ── Seek bar ──────────────────────────────────────────────────────────
    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      v.currentTime = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
      showBriefly();
    }, [duration, showBriefly]);

    const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      v.currentTime = Math.max(0, Math.min(duration, ((touch.clientX - rect.left) / rect.width) * duration));
      showBriefly();
    }, [duration, showBriefly]);

    // ── Volume ────────────────────────────────────────────────────────────
    const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const v = videoRef.current;
      if (!v) return;
      const vol = Number(e.target.value);
      v.volume = vol;
      v.muted = vol === 0;
      setVolume(vol);
      setMuted(vol === 0);
    }, []);

    const toggleMute = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      const next = !muted;
      v.muted = next;
      setMuted(next);
      if (!next && volume === 0) { v.volume = 1; setVolume(1); }
    }, [muted, volume]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black overflow-hidden select-none',
          fullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none' : 'aspect-video rounded-2xl'
        )}
        onMouseMove={showBriefly}
        onMouseLeave={() => { if (playing) setShowCtrl(false); }}
      >
        {/* ── Video element — no onClick, overlays handle it ── */}
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
        />

        {/* ── Loading spinner ── */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            style={{ background: 'rgba(15,17,23,0.8)' }}>
            <div className="w-16 h-16 rounded-full mb-3"
              style={{ border: '3px solid rgba(167,139,250,0.15)', borderTop: '3px solid #a78bfa', animation: 'spinLoader 0.9s linear infinite' }} />
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading video...</p>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#a78bfa', animation: 'preloaderBounce 0.65s ease-in-out infinite', animationDelay: (i * 0.15) + 's' }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Big play button when paused ── */}
        {!playing && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center justify-center"
              style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(167,139,250,0.88)', boxShadow: '0 0 32px rgba(167,139,250,0.4)' }}>
              <Play className="w-8 h-8 fill-white text-white" style={{ marginLeft: 5 }} />
            </div>
          </div>
        )}

        {/* ── Touch / click overlays — LEFT half ── */}
        <div
          className="absolute left-0 top-0 h-full z-20 cursor-pointer"
          style={{ width: '50%' }}
          onTouchStart={handleTouchStart('left')}
          onClick={handleClick('left')}
        />

        {/* ── Touch / click overlays — RIGHT half ── */}
        <div
          className="absolute right-0 top-0 h-full z-20 cursor-pointer"
          style={{ width: '50%' }}
          onTouchStart={handleTouchStart('right')}
          onClick={handleClick('right')}
        />

        {/* ── Skip flash indicator ── */}
        {skipFlash && (
          <div className={cn(
            'absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none',
            skipFlash === 'left' ? 'left-6' : 'right-6'
          )}>
            <div className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              {skipFlash === 'left'
                ? <RotateCcw className="w-7 h-7 text-white" />
                : <RotateCw className="w-7 h-7 text-white" />}
            </div>
            <span className="text-white text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-nums"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              {skipFlash === 'left' ? '−10s' : '+10s'}
            </span>
          </div>
        )}

        {/* ── Controls overlay ── */}
        <div className={cn(
          'absolute inset-0 flex flex-col justify-end z-25 pointer-events-none transition-opacity duration-300',
          showCtrl ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="pointer-events-auto"
            style={{ background: 'linear-gradient(to top, rgba(10,10,18,0.98) 0%, rgba(10,10,18,0.55) 55%, transparent 100%)', padding: '56px 14px 14px' }}>

            {/* Title */}
            {title && (
              <p className="text-xs mb-2 line-clamp-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{title}</p>
            )}

            {/* Progress bar */}
            <div
              className="relative h-1.5 rounded-full mb-4 cursor-pointer group/seek"
              style={{ background: 'rgba(255,255,255,0.2)' }}
              onClick={handleSeek}
              onTouchMove={handleSeekTouch}
            >
              <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                style={{ width: buffered + '%', background: 'rgba(255,255,255,0.3)' }} />
              <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                style={{ width: progress + '%', background: '#a78bfa' }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: 'calc(' + progress + '% - 7px)', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.8)' }} />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center justify-between gap-2">

              {/* Left controls */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onTouchEnd={(e) => { e.preventDefault(); togglePlay(); }}
                  onClick={() => { if (!lastWasTouch.current) togglePlay(); lastWasTouch.current = false; }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button
                  onTouchEnd={(e) => { e.preventDefault(); skip(-10); }}
                  onClick={() => skip(-10)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                  title="−10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onTouchEnd={(e) => { e.preventDefault(); skip(10); }}
                  onClick={() => skip(10)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                  title="+10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume (desktop only) */}
                <div className="relative hidden sm:flex items-center gap-1">
                  <button
                    onClick={toggleMute}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                    onMouseEnter={() => setShowVol(true)}
                    onMouseLeave={() => setShowVol(false)}
                  >
                    {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {showVol && (
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 flex items-center"
                      onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
                      <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                        onChange={handleVolume}
                        className="w-20 accent-purple-400"
                        style={{ accentColor: '#a78bfa' }}
                      />
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-mono-nums ml-1 hidden sm:inline"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>
                <span className="text-[11px] font-mono-nums ml-1 sm:hidden"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {fmtTime(currentTime)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-0.5 sm:gap-1">

                {/* Speed */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSpeed(s => !s); setShowQuality(false); }}
                    className="flex items-center gap-1 h-9 px-2 rounded-xl text-white text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono-nums">{speed}×</span>
                  </button>
                  {showSpeed && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-2xl p-1.5 shadow-2xl z-50"
                      style={{ background: 'rgba(18,20,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 100 }}>
                      <p className="text-[9px] px-2 pt-1 pb-0.5 uppercase tracking-widest"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Speed</p>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => setSpeedFn(s)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl text-left font-bold transition-colors font-mono-nums"
                          style={speed === s
                            ? { color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }
                            : { color: 'rgba(255,255,255,0.6)' }}>
                          {s === 1 ? '1× Normal' : s + '×'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality */}
                <div className="relative">
                  <button
                    onClick={() => { setShowQuality(q => !q); setShowSpeed(false); }}
                    className="h-9 px-2 rounded-xl text-white text-[10px] font-black hover:bg-white/10 transition-colors tracking-wide"
                  >
                    {currentQuality}
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-2xl p-1.5 shadow-2xl z-50"
                      style={{ background: 'rgba(18,20,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 80 }}>
                      {qualities.map(q => (
                        <button key={q}
                          onClick={() => { onQualityChange?.(q); setShowQuality(false); }}
                          className="w-full px-3 py-1.5 text-xs rounded-xl text-left font-bold transition-colors"
                          style={currentQuality === q
                            ? { color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }
                            : { color: 'rgba(255,255,255,0.6)' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onTouchEnd={(e) => { e.preventDefault(); toggleFs(); }}
                  onClick={toggleFs}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
                  title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  