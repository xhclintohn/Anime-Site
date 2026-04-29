import { useState, useEffect, useRef } from 'react';
  import { Link, useNavigate, useLocation } from 'react-router-dom';
  import { Search, Menu, X, Zap, Tv, Film, Clapperboard, Tag, Clock, Home, MessageCircle, ChevronRight } from 'lucide-react';
  import { cn } from '@/lib/utils';

  const WA_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCKkVc7z4kh02WGqF0m';

  const navLinks = [
    { name: 'Home',    href: '/',                  icon: Home },
    { name: 'Series',  href: '/anime/list/series', icon: Tv },
    { name: 'Movies',  href: '/anime/list/movie',  icon: Film },
    { name: 'OVA',     href: '/anime/list/ova',    icon: Clapperboard },
    { name: 'Genres',  href: '/genres',            icon: Tag },
    { name: 'History', href: '/history',           icon: Clock },
  ];

  export function Navbar() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const searchRef = useRef<HTMLInputElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const fn = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', fn, { passive: true });
      return () => window.removeEventListener('scroll', fn);
    }, []);

    useEffect(() => { setDrawerOpen(false); setSearchOpen(false); }, [location.pathname]);

    useEffect(() => { if (searchOpen && searchRef.current) searchRef.current.focus(); }, [searchOpen]);

    useEffect(() => {
      document.body.style.overflow = drawerOpen ? 'hidden' : '';
      return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) { navigate('/search?q=' + encodeURIComponent(q)); setSearchQuery(''); setSearchOpen(false); setDrawerOpen(false); }
    };

    const isActive = (href: string) => href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

    return (
      <>
        <nav className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', scrolled ? 'glass-nav' : 'bg-transparent')}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-16 gap-3">

              {/* Mobile hamburger */}
              <button onClick={() => setDrawerOpen(true)} aria-label="Menu"
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/8 transition-colors shrink-0 lg:hidden"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="relative w-8 h-8 flex items-center justify-center rounded-xl shadow-glow-sm" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                  <Zap className="w-4 h-4 fill-current" style={{ color: '#a78bfa' }} />
                </div>
                <span className="text-base font-black tracking-tight hidden xs:inline" style={{ color: '#e2e8f0' }}>
                  Toxi<span style={{ color: '#a78bfa' }}>Nime</span>
                </span>
              </Link>

              {/* Desktop nav links */}
              <nav className="hidden lg:flex items-center gap-1 ml-3">
                {navLinks.map(({ name, href }) => (
                  <Link key={href} to={href}
                    className={cn('px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200', isActive(href) ? 'text-white' : 'hover:text-white')}
                    style={isActive(href) ? { background: 'rgba(167,139,250,0.14)', color: '#a78bfa' } : { color: 'rgba(255,255,255,0.55)' }}
                  >
                    {name}
                  </Link>
                ))}
              </nav>

              {/* Desktop search */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm ml-auto items-center gap-2 relative">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(167,139,250,0.4)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                  />
                </div>
              </form>

              {/* Mobile search icon */}
              <button onClick={() => setSearchOpen(s => !s)} aria-label="Search"
                className="flex items-center justify-center w-10 h-10 rounded-xl md:hidden hover:bg-white/8 transition-colors ml-auto"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>

              {/* WhatsApp (desktop) */}
              <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 shrink-0"
                style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366' }}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>

            {/* Mobile search bar */}
            {searchOpen && (
              <form onSubmit={handleSearch} className="pb-3 md:hidden slide-down">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    ref={mobileSearchRef}
                    autoFocus
                    type="text"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(167,139,250,0.3)', color: '#e2e8f0' }}
                  />
                </div>
              </form>
            )}
          </div>
        </nav>

        {/* Drawer backdrop */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setDrawerOpen(false)}
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
        )}

        {/* Drawer */}
        <aside className={cn('fixed top-0 left-0 h-full z-[70] flex flex-col lg:hidden transition-transform duration-300 ease-out', drawerOpen ? 'translate-x-0' : '-translate-x-full')}
          style={{ width: 280, background: '#0e0f1a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <Link to="/" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
              <div className="w-8 h-8 flex items-center justify-center rounded-xl shadow-glow-sm" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                <Zap className="w-4 h-4 fill-current" style={{ color: '#a78bfa' }} />
              </div>
              <span className="text-base font-black" style={{ color: '#e2e8f0' }}>Toxi<span style={{ color: '#a78bfa' }}>Nime</span></span>
            </Link>
            <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer nav links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {navLinks.map(({ name, href, icon: Icon }) => (
              <Link key={href} to={href} onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group"
                style={isActive(href)
                  ? { background: 'rgba(167,139,250,0.14)', color: '#a78bfa' }
                  : { color: 'rgba(255,255,255,0.6)' }}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">{name}</span>
                {isActive(href) && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            ))}
          </nav>

          {/* Drawer footer — WhatsApp */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.18)', color: '#25d366' }}>
              <MessageCircle className="w-5 h-5" /> Join WhatsApp Channel
            </a>
          </div>
        </aside>
      </>
    );
  }
  