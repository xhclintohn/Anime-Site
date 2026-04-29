import { Search, Film, AlertCircle, RefreshCw, Zap } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';

  type EmptyStateType = 'search' | 'anime' | 'error';

  interface EmptyStateProps {
    type?: EmptyStateType;
    title?: string;
    description?: string;
    className?: string;
    onRetry?: () => void;
  }

  const content: Record<EmptyStateType, { icon: typeof Search; title: string; description: string }> = {
    search: { icon: Search, title: 'No results found', description: 'Try a different keyword or check the spelling.' },
    anime: { icon: Film, title: 'No anime found', description: 'Nothing here yet. Try a different category.' },
    error: { icon: AlertCircle, title: 'Something went wrong', description: 'Failed to load content. Please try again.' },
  };

  export function EmptyState({ type = 'anime', title, description, className, onRetry }: EmptyStateProps) {
    const { icon: Icon, title: defaultTitle, description: defaultDesc } = content[type];

    return (
      <div className={cn('flex flex-col items-center justify-center py-20 px-6 text-center', className)}>
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-5',
          type === 'error' ? 'bg-destructive/10' : 'bg-accent/10'
        )}>
          <Icon className={cn('w-8 h-8', type === 'error' ? 'text-destructive' : 'text-accent')} />
        </div>
        <h3 className="text-lg font-bold mb-2">{title || defaultTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">{description || defaultDesc}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />Try Again
          </Button>
        )}
        {type === 'anime' && !onRetry && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Zap className="w-3 h-3 text-accent" />
            Powered by ToxiNime dual-source engine
          </div>
        )}
      </div>
    );
  }