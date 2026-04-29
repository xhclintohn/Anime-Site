import { useState, useEffect, useRef } from 'react';
  import { Link, useNavigate, useLocation } from 'react-router-dom';
  import { Search, Menu, X, Zap, Tv, Film, Clapperboard, Tag, Clock, Home } from 'lucide-react';
  import { cn } from '@/lib/utils';

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Series', href: '/anime/list/series', icon: Tv },
    { name: 'Movies', href: '/anime/list/movie', icon: Film },
    { name: 'OVA', href: '/anime/list/ova', icon: Clapperboard },
    { name: 'Genres', href: '/genres', icon: Tag },
    { name: 'History', href: '/history', icon: Clock },
  ];

  export function Navbar() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const handler = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handler, { passive: true });
      return () => window.removeEventListener('scroll', handler);
    }, []);

    useEffect(() => {
      setDrawerOpen(false);
      setSearchOpen(false);
    }, [location.pathname]);

    useEffect(() => {
      if (searchOpen && searchRef.current) searchRef.current.focus();
    }, [searchOpen]);

    useEffect(() => {
      document.body.style.overflow = drawerOpen ? 'hidden' : '';
      return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate('/search?q=' + encodeURIComponent(searchQuery.trim()));
        setSearchQuery('');
        setSearchOpen(false);
        setDrawerOpen(false);
      }
    };

    return (
      <>
        <nav className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-lg'
            : 'bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm'
        )}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-16 gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link to="/" className="flex items-center gap-2 group shrink-0 mr-2">
                <div className="relative">
                  <Zap className="w-7 h-7 text-accent fill-accent group-hover:scale-110 transition-transform duration-200" />
                  <div className="absolute inset-0 bg-accent/40 blur-md group-hover:blur-xl transition-all duration-300 rounded-full" />
                </div>
                <span className="text-xl font-black tracking-tight hidden sm:block">
                  Toxi<span className="text-accent">Nime</span>
                </span>
              </Link>

              <div className="hidden lg:flex items-center gap-1 flex-1">
                {navLinks.slice(1, 5).map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      location.pathname === link.href
                        ? 'bg-accent/15 text-accent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="flex-1 lg:flex-none flex justify-end items-center gap-2">
                {searchOpen ? (
                  <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 lg:w-72">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search anime..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/70 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border transition-all duration-200 text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span className="hidden md:inline">Search anime...</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
            <div
              className="w-72 max-w-[85vw] h-full bg-card border-r border-border/60 flex flex-col shadow-2xl"
              style={{ animation: 'slideInFromLeft 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <Link to="/" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
                  <Zap className="w-6 h-6 text-accent fill-accent" />
                  <span className="text-lg font-black">Toxi<span className="text-accent">Nime</span></span>
                </Link>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSearch} className="p-4 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/70 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </div>
              </form>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      location.pathname === link.href
                        ? 'bg-accent/15 text-accent border border-accent/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground text-center">
                  ToxiNime &copy; {new Date().getFullYear()}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-background/50 backdrop-blur-sm" />
          </div>
        )}
      </>
    );
  }