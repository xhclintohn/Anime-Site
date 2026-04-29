import { Link } from 'react-router-dom';
  import { Play, Star } from 'lucide-react';
  import type { AnimeItem } from '@/services/mobinime';

  interface AnimeCardProps {
    anime: AnimeItem;
    index?: number;
    showEpisode?: boolean;
  }

  export function AnimeCard({ anime, index = 0, showEpisode = false }: AnimeCardProps) {
    const imageUrl = anime.image_cover || anime.imageCover || anime.poster || anime.thumbnail || '/placeholder.svg';
    const totalEpisodes = anime.totalEpisode || anime.totalEpisodes;
    const currentEpisode = anime.episode;

    return (
      <Link
        to={'/anime/' + anime.id}
        className="group relative block rounded-xl overflow-hidden hover-glow scroll-fade"
        style={{ transitionDelay: (index * 0.04) + 's' }}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={anime.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center shadow-glow transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 text-accent-foreground fill-accent-foreground ml-0.5" />
            </div>
          </div>
          {anime.rating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/85 backdrop-blur-sm text-xs font-semibold">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span>{anime.rating}</span>
            </div>
          )}
          {anime.type && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-accent/90 text-accent-foreground text-xs font-bold uppercase tracking-wide">
              {anime.type}
            </div>
          )}
          {showEpisode && currentEpisode && totalEpisodes && (
            <div className="absolute bottom-11 left-2 px-2 py-1 rounded-lg bg-primary/90 text-primary-foreground text-xs font-semibold">
              EP {currentEpisode}/{totalEpisodes}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors duration-200">
            {anime.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            {anime.year && <span>{anime.year}</span>}
            {anime.year && totalEpisodes && <span>&middot;</span>}
            {totalEpisodes && <span>{totalEpisodes} Eps</span>}
            {!anime.year && !totalEpisodes && anime.status && <span>{anime.status}</span>}
          </div>
        </div>
      </Link>
    );
  }

  export function AnimeCardSkeleton() {
    return (
      <div className="relative rounded-xl overflow-hidden">
        <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <div className="h-3.5 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }