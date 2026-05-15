import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Zap, Tv, Film, Clapperboard, Tag, Clock, Home, MessageCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WA_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb7dL1LHltY3pgCvwR3B';

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
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setDrawerOpen(false); setSearchOpen(false); }, [location.pathname]);
  useEffect(() => { if (searchOpen && desktopRef.current) desktopRef.current.focus(); }, [searchOpen]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setDrawerOpen(false); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) { navigate('/search?q=' + encodeURIComponent(q)); setSearchQuery(''); setSearchOpen(false); setDrawerOpen(false); }
  };

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={scrolled
          ? { background: 'rgba(9,9,18,0.95)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 30px rgba(0,0,0,0.35)' }
          : { background: 'linear-gradient(180deg,rgba(9,9,18,0.82) 0%,transparent 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16 gap-2">
            <button onClick={() => setDrawerOpen(true)} aria-label="Open menu"
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0 lg:hidden"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.22),rgba(129,140,248,0.12))', border: '1px solid rgba(167,139,250,0.35)', boxShadow: '0 0 14px rgba(167,139,250,0.18)' }}>
                <Zap className="w-4 h-4 fill-current" style={{ color: '#a78bfa' }} />
              </div>
              <span className="text-[15px] font-black tracking-tight hidden xs:inline" style={{ color: '#e2e8f0' }}>
                Toxi<span style={{ color: '#a78bfa' }}>Nime</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 ml-4">
              {navLinks.map(({ name, href }) => (
                <Link key={href + name} to={href}
                  className="relative px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={isActive(href) ? { color: '#a78bfa', background: 'rgba(167,139,250,0.12)' } : { color: 'rgba(255,255,255,0.52)' }}>
                  {name}
                  {isActive(href) && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{ background: '#a78bfa' }} />}
                </Link>
              ))}
            </nav>

            {searchOpen ? (
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 ml-4 items-center relative" style={{ maxWidth: 380 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#a78bfa' }} />
                <input ref={desktopRef} type="text" placeholder="Search anime... (Esc to close)"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.4)', color: '#e2e8f0' }} />
                <button type="button" onClick={() => setSearchOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 ml-4 items-center" style={{ maxWidth: 320 }}>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input type="text" placeholder="Search anime..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full pl-9 pr-12 py-2 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#e2e8f0' }} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md hidden lg:block select-none"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    ⌘K
                  </span>
                </div>
              </form>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={() => setSearchOpen(s => !s)} aria-label="Search"
                className="flex items-center justify-center w-10 h-10 rounded-xl md:hidden"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
              <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0"
                style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.22)', color: '#25d366' }}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
          </div>

          {searchOpen && (
            <form onSubmit={handleSearch} className="pb-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input ref={mobileRef} autoFocus type="text" placeholder="Search anime..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(167,139,250,0.35)', color: '#e2e8f0' }} />
              </div>
            </form>
          )}
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setDrawerOpen(false)}
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }} />
      )}

      <aside
        className={cn('fixed top-0 left-0 h-full z-[70] flex flex-col lg:hidden transition-transform duration-300 ease-out', drawerOpen ? 'translate-x-0' : '-translate-x-full')}
        style={{ width: 285, background: 'rgba(10,10,20,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
            <div className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.22),rgba(129,140,248,0.12))', border: '1px solid rgba(167,139,250,0.3)' }}>
              <Zap className="w-4 h-4 fill-current" style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <div className="text-[15px] font-black leading-tight" style={{ color: '#e2e8f0' }}>Toxi<span style={{ color: '#a78bfa' }}>Nime</span></div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Free Anime Streaming</div>
            </div>
          </Link>
          <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" placeholder="Search anime..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
            </div>
          </form>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navLinks.map(({ name, href, icon: Icon }) => (
            <Link key={href + name} to={href} onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
              style={isActive(href) ? { background: 'rgba(167,139,250,0.13)', color: '#a78bfa', borderLeft: '2px solid #a78bfa' } : { color: 'rgba(255,255,255,0.6)' }}>
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="font-semibold text-sm flex-1">{name}</span>
              {isActive(href) && <ChevronRight className="w-4 h-4" />}
            </Link>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366' }}>
            <MessageCircle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm">Join WhatsApp Channel</div>
              <div className="text-[11px] opacity-70">Get anime updates &amp; more</div>
            </div>
          </a>
        </div>
      </aside>
    </>
  );
}
