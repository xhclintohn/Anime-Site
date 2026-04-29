import { Link } from 'react-router-dom';
  import { Play, Star } from 'lucide-react';
  import type { AnimeItem } from '@/services/mobinime';
  import { cn } from '@/lib/utils';

  interface AnimeCardProps {
    anime: AnimeItem;
    index?: number;
    showEpisode?: boolean;
  }

  export function AnimeCard({ anime, index = 0, showEpisode = false }: AnimeCardProps) {
    const imageUrl = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '';
    const totalEpisodes = anime.totalEpisode || anime.totalEpisodes;
    const currentEpisode = anime.episode;
    const year = anime.year || anime.tahun;

    return (
      <Link
        to={'/anime/' + anime.id}
        className="group relative flex flex-col rounded-2xl overflow-hidden card-hover anime-card-enter"
        style={{ animationDelay: (index * 0.04) + 's', animationFillMode: 'both' }}
      >
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={anime.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
              style={{ display: 'block' }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full skeleton-wave" />
          )}

          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,17,23,0.95) 0%, rgba(15,17,23,0.4) 40%, transparent 70%)' }} />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div
              className="w-13 h-13 flex items-center justify-center shadow-glow"
              style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(167,139,250,0.9)' }}
            >
              <Play className="w-6 h-6 fill-white text-white ml-0.5" />
            </div>
          </div>

          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            {anime.type && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{ background: 'rgba(124,58,237,0.85)', color: '#e2e8f0', borderRadius: 6 }}
              >
                {anime.type}
              </span>
            )}
            {anime.rating && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold font-mono-nums ml-auto"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', borderRadius: 6, color: '#fbbf24' }}
              >
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                {Number(anime.rating).toFixed(1)}
              </span>
            )}
          </div>

          {showEpisode && currentEpisode && totalEpisodes && (
            <div className="absolute bottom-14 left-2">
              <span
                className="px-2 py-0.5 text-[9px] font-bold font-mono-nums"
                style={{ background: 'rgba(0,0,0,0.8)', color: '#e2e8f0', borderRadius: 5 }}
              >
                {currentEpisode}/{totalEpisodes} eps
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-2.5 pb-2">
            <h3
              className="text-[12px] sm:text-[13px] font-bold leading-tight line-clamp-2 transition-colors duration-200"
              style={{ color: '#e2e8f0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {anime.title}
            </h3>
            {(year || anime.status) && (
              <p className="text-[10px] mt-0.5 font-mono-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {year}{year && anime.status ? ' · ' : ''}{anime.status}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  export function AnimeCardSkeleton() {
    return (
      <div className="relative flex flex-col rounded-2xl overflow-hidden" style={{ aspectRatio: '2/3' }}>
        <div
          className="w-full h-full skeleton-wave"
          style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>
    );
  }
  