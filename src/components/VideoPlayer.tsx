import { useEffect, useRef, useState, useCallback } from 'react';
  import Hls from 'hls.js';
  import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    RotateCcw, RotateCw, Settings, Loader2, Gauge
  } from 'lucide-react';
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

  function formatTime(time: number) {
    if (!isFinite(time)) return '0:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }

  export function VideoPlayer({
    src, poster, title,
    onQualityChange, qualities = ['HD', 'SD'], currentQuality = 'HD'
  }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const tapCountRef = useRef(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [speed, setSpeed] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [skipFlash, setSkipFlash] = useState<'left' | 'right' | null>(null);
    const [skipAmount, setSkipAmount] = useState(10);
    const [buffered, setBuffered] = useState(0);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;
      setIsLoading(true);
      setIsPlaying(false);

      if (Hls.isSupported() && src.includes('.m3u8')) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
        return () => hls.destroy();
      } else {
        video.src = src;
      }
    }, [src]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      const onTime = () => {
        setCurrentTime(video.currentTime);
        if (video.buffered.length > 0) {
          setBuffered((video.buffered.end(video.buffered.length - 1) / (video.duration || 1)) * 100);
        }
      };
      const onMeta  = () => { setDuration(video.duration); setIsLoading(false); };
      const onPlay  = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onWait  = () => setIsLoading(true);
      const onCan   = () => setIsLoading(false);
      const onFull  = () => setIsFullscreen(!!document.fullscreenElement);
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('waiting', onWait);
      video.addEventListener('canplay', onCan);
      document.addEventListener('fullscreenchange', onFull);
      return () => {
        video.removeEventListener('timeupdate', onTime);
        video.removeEventListener('loadedmetadata', onMeta);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('waiting', onWait);
        video.removeEventListener('canplay', onCan);
        document.removeEventListener('fullscreenchange', onFull);
      };
    }, []);

    const showControlsBriefly = useCallback(() => {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }, 3000);
    }, []);

    const togglePlay = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) { v.play(); } else { v.pause(); }
      showControlsBriefly();
    }, [showControlsBriefly]);

    const skip = useCallback((secs: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
      setSkipFlash(secs > 0 ? 'right' : 'left');
      setSkipAmount(Math.abs(secs));
      setTimeout(() => setSkipFlash(null), 600);
    }, []);

    const handleTap = useCallback((side: 'left' | 'right') => {
      tapCountRef.current += 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        if (tapCountRef.current === 1) {
          togglePlay();
        } else if (tapCountRef.current >= 2) {
          skip(side === 'right' ? 10 : -10);
        }
        tapCountRef.current = 0;
      }, 280);
    }, [togglePlay, skip]);

    const toggleMute = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = !isMuted;
      setIsMuted(!isMuted);
    }, [isMuted]);

    const changeSpeed = useCallback((s: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.playbackRate = s;
      setSpeed(s);
      setShowSpeedMenu(false);
    }, []);

    const toggleFullscreen = useCallback(async () => {
      const container = containerRef.current;
      if (!container) return;
      if (!document.fullscreenElement) {
        try {
          await container.requestFullscreen();
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('portrait').catch(() => {});
          }
        } catch {
        }
      } else {
        await document.exitFullscreen();
        if (screen.orientation && 'unlock' in screen.orientation) {
          (screen.orientation as unknown as { unlock: () => void }).unlock();
        }
      }
    }, []);

    const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      v.currentTime = ratio * duration;
    }, [duration]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div
        ref={containerRef}
        className={cn('relative bg-black overflow-hidden select-none', isFullscreen ? 'w-screen h-screen rounded-none' : 'aspect-video rounded-xl')}
        onMouseMove={showControlsBriefly}
        onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      >
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          onClick={togglePlay}
        />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              </div>
            </div>
            <p className="mt-3 text-xs text-white/60 animate-pulse">Loading stream...</p>
          </div>
        )}

        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center shadow-glow animate-pulse">
              <Play className="w-9 h-9 text-accent-foreground fill-accent-foreground ml-1" />
            </div>
          </div>
        )}

        <div
          className="absolute left-0 top-0 w-1/2 h-full z-20 cursor-pointer"
          onTouchStart={() => handleTap('left')}
          onClick={(e) => { if (e.detail === 2) { skip(-10); } else if (e.detail === 1) { setTimeout(() => { if (tapCountRef.current <= 1) togglePlay(); }, 200); } }}
        />
        <div
          className="absolute right-0 top-0 w-1/2 h-full z-20 cursor-pointer"
          onTouchStart={() => handleTap('right')}
          onClick={(e) => { if (e.detail === 2) { skip(10); } else if (e.detail === 1) { setTimeout(() => { if (tapCountRef.current <= 1) togglePlay(); }, 200); } }}
        />

        {skipFlash && (
          <div className={cn('absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none transition-all duration-300', skipFlash === 'left' ? 'left-6' : 'right-6')}>
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {skipFlash === 'left' ? <RotateCcw className="w-7 h-7 text-white" /> : <RotateCw className="w-7 h-7 text-white" />}
            </div>
            <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded-full">{skipFlash === 'left' ? '-' : '+'}{skipAmount}s</span>
          </div>
        )}

        <div className={cn('absolute inset-0 flex flex-col justify-end z-25 transition-opacity duration-300 pointer-events-none', showControls ? 'opacity-100' : 'opacity-0')}>
          <div className="bg-gradient-to-t from-black/95 via-black/50 to-transparent pt-12 pb-3 px-4 pointer-events-auto">
            {title && <p className="text-xs text-white/70 font-medium mb-2 line-clamp-1">{title}</p>}

            <div
              className="relative h-1 bg-white/20 rounded-full mb-4 cursor-pointer group/seek"
              onClick={handleSeekClick}
            >
              <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: buffered + '%' }} />
              <div className="absolute left-0 top-0 h-full bg-accent rounded-full transition-all" style={{ width: progress + '%' }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-glow opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: 'calc(' + progress + '% - 6px)' }}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white">
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button onClick={() => skip(-10)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white" title="Back 10s">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => skip(10)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white" title="Forward 10s">
                  <RotateCw className="w-4 h-4" />
                </button>

                <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="text-[11px] text-white/70 font-mono ml-1 hidden sm:inline">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <div className="relative">
                  <button
                    onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSettings(false); }}
                    className="flex items-center gap-1 h-8 px-2 rounded-lg hover:bg-white/10 transition-colors text-white text-xs font-bold"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{speed === 1 ? '1x' : speed + 'x'}</span>
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl p-1.5 min-w-[80px] z-50 shadow-xl">
                      <p className="text-[10px] text-muted-foreground px-2 mb-1 uppercase tracking-wider">Speed</p>
                      {SPEEDS.map((s) => (
                        <button key={s} onClick={() => changeSpeed(s)}
                          className={cn('w-full px-3 py-1.5 text-xs rounded-lg text-left hover:bg-muted transition-colors font-semibold', speed === s && 'text-accent bg-accent/10')}>
                          {s === 1 ? '1× Normal' : s + '×'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button onClick={() => { setShowSettings(!showSettings); setShowSpeedMenu(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white">
                    <Settings className="w-4 h-4" />
                  </button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl p-1.5 min-w-[100px] z-50 shadow-xl">
                      <p className="text-[10px] text-muted-foreground px-2 mb-1 uppercase tracking-wider">Quality</p>
                      {qualities.map((q) => (
                        <button key={q} onClick={() => { onQualityChange?.(q); setShowSettings(false); }}
                          className={cn('w-full px-3 py-1.5 text-xs rounded-lg text-left hover:bg-muted transition-colors font-semibold', currentQuality === q && 'text-accent bg-accent/10')}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={toggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  