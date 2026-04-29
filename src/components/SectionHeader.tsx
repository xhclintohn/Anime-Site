import { Link } from 'react-router-dom';
  import { ChevronRight } from 'lucide-react';
  import { cn } from '@/lib/utils';

  interface SectionHeaderProps {
    title: string;
    href?: string;
    className?: string;
  }

  export function SectionHeader({ title, href, className }: SectionHeaderProps) {
    return (
      <div className={cn('flex items-center justify-between mb-6', className)}>
        <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
        {href && (
          <Link
            to={href}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent font-medium transition-colors group"
          >
            View all
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    );
  }