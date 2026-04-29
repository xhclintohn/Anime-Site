import { Helmet } from 'react-helmet-async';
  import { Link } from 'react-router-dom';
  import { Clock, Play, Trash2, ChevronLeft, Zap } from 'lucide-react';
  import { Navbar } from '@/components/Navbar';
  import { useWatchHistory } from '@/hooks/useWatchHistory';
  import { formatDistanceToNow } from 'date-fns';

  export default function HistoryPage() {
    const { history, remove, clear } = useWatchHistory();

    return (
      <>
        <Helmet>
          <title>Watch History - ToxiNime</title>
        </Helmet>
        <Navbar />
        <main className="min-h-screen pt-20 pb-16 page-enter">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back to Home
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black">Watch History</h1>
                    <p className="text-sm text-muted-foreground">{history.length} episode{history.length !== 1 ? 's' : ''} watched</p>
                  </div>
                </div>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clear}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 border border-border/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Start watching anime and your history will appear here automatically.
                </p>
                <Link
                  to="/"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm shadow-glow hover:scale-105 transition-transform"
                >
                  <Zap className="w-4 h-4" /> Browse Anime
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div
                    key={entry.animeId + entry.episodeId + index}
                    className="flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 hover:border-border/80 group transition-all duration-200 scroll-fade"
                    style={{ transitionDelay: (index * 0.03) + 's' }}
                  >
                    <Link to={'/watch/' + entry.animeId + '/' + entry.episodeId} className="shrink-0">
                      <div className="w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                        {entry.poster ? (
                          <img src={entry.poster} alt={entry.animeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={'/anime/' + entry.animeId}>
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-1 hover:text-accent transition-colors">{entry.animeTitle}</h3>
                      </Link>
                      <p className="text-xs text-accent font-medium mt-0.5">Episode {entry.episodeNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(entry.watchedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={'/watch/' + entry.animeId + '/' + entry.episodeId}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:scale-105 transition-transform shadow-glow"
                      >
                        <Play className="w-3 h-3 fill-accent-foreground" />
                        <span className="hidden sm:inline">Resume</span>
                      </Link>
                      <button
                        onClick={() => remove(entry.animeId)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </>
    );
  }