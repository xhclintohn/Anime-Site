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
        className="group relative block rounded-2xl overflow-hidden bg-card border border-border/30 anime-card-enter"
        style={{
          animationDelay: (index * 0.05) + 's',
          animationFillMode: 'both',
        }}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={anime.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center shadow-glow scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-accent-foreground fill-accent-foreground ml-0.5" />
            </div>
          </div>

          <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
            {anime.type && (
              <span className="px-2 py-0.5 rounded-md bg-accent/90 text-accent-foreground text-[10px] font-black uppercase tracking-wider">
                {anime.type}
              </span>
            )}
            {anime.rating && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold ml-auto">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                {Number(anime.rating).toFixed(1)}
              </span>
            )}
          </div>

          {showEpisode && currentEpisode && totalEpisodes && (
            <div className="absolute bottom-11 left-2">
              <span className="px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-semibold">
                {currentEpisode}/{totalEpisodes} eps
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className={cn(
            'text-xs sm:text-[13px] font-semibold line-clamp-2 leading-tight transition-colors duration-200',
            'text-foreground/85 group-hover:text-accent'
          )}>
            {anime.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
            {year && <span>{year}</span>}
            {year && (totalEpisodes || anime.status) && <span>&middot;</span>}
            {totalEpisodes ? <span>{totalEpisodes} eps</span> : anime.status ? <span>{anime.status}</span> : null}
          </div>
        </div>

        <div className="absolute inset-0 rounded-2xl ring-1 ring-border/30 group-hover:ring-accent/40 transition-all duration-300 pointer-events-none" />
      </Link>
    );
  }

  export function AnimeCardSkeleton() {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30">
        <div className="aspect-[2/3] bg-muted/60 animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-3.5 bg-muted/80 rounded-lg w-full animate-pulse" />
          <div className="h-3 bg-muted/60 rounded-lg w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }
  