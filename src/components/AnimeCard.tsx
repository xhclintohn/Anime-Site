import { Link } from 'react-router-dom';
  import { Play, Star, Wifi } from 'lucide-react';
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
    const isJikan = anime.source === 'jikan';

    return (
      <Link
        to={'/anime/' + anime.id}
        className="group relative block rounded-2xl overflow-hidden hover-glow card-shine scroll-fade bg-card border border-border/30"
        style={{ transitionDelay: (index * 0.04) + 's', animationDelay: (index * 0.04) + 's' }}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={anime.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full loading-shimmer" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center shadow-glow transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-accent-foreground fill-accent-foreground ml-0.5" />
            </div>
          </div>

          <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2">
            {anime.type && (
              <span className="px-2 py-1 rounded-lg bg-accent/90 text-accent-foreground text-[10px] font-black uppercase tracking-wider">
                {anime.type}
              </span>
            )}
            {anime.rating && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background/85 backdrop-blur-sm text-[10px] font-bold ml-auto">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                {Number(anime.rating).toFixed(1)}
              </span>
            )}
          </div>

          {isJikan && (
            <div className="absolute top-2 right-2 mt-7">
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/80 text-white text-[9px] font-bold">
                <Wifi className="w-2 h-2" />MAL
              </span>
            </div>
          )}

          {showEpisode && currentEpisode && totalEpisodes && (
            <div className="absolute bottom-12 left-2">
              <span className="px-2 py-1 rounded-lg bg-primary/90 text-primary-foreground text-[10px] font-semibold">
                EP {currentEpisode}/{totalEpisodes}
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 pt-4">
          <h3 className={cn(
            "text-xs sm:text-sm font-semibold line-clamp-2 transition-colors duration-200 leading-tight",
            "text-foreground/90 group-hover:text-accent"
          )}>
            {anime.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
            {year && <span>{year}</span>}
            {year && (totalEpisodes || anime.status) && <span>&middot;</span>}
            {totalEpisodes ? <span>{totalEpisodes} Eps</span> : anime.status ? <span>{anime.status}</span> : null}
          </div>
        </div>
      </Link>
    );
  }

  export function AnimeCardSkeleton() {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30">
        <div className="aspect-[2/3] loading-shimmer" />
        <div className="p-3 space-y-2">
          <div className="h-3.5 loading-shimmer rounded-lg w-full" />
          <div className="h-3 loading-shimmer rounded-lg w-2/3" />
        </div>
      </div>
    );
  }