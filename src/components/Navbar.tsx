import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Zap, Tv, Film, Clapperboard, Tag, Clock, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WA_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb7dL1LHltY3pgCvwR3B';
const GITHUB_URL = 'https://github.com/xhclintohn/Anime-Site';
const CONTACT_WA_URL = 'https://wa.me/?text=Hi+ToxiNime+Developer';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.216.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

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
          ? { background: 'rgba(9,9,18,0.97)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 30px rgba(0,0,0,0.35)' }
          : { background: 'linear-gradient(180deg,rgba(9,9,18,0.85) 0%,transparent 100%)' }}
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

              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                title="Source Code"
                style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GitHubIcon className="w-4 h-4" />
              </a>

              <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0"
                title="Join Channel"
                style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.22)', color: '#25d366' }}>
                <WhatsAppIcon className="w-3.5 h-3.5" /> Updates
              </a>
            </div>
          </div>

        </div>
      </nav>

      {searchOpen && (
        <div className="fixed left-0 right-0 z-40 md:hidden" style={{ top: 64 }}
          onClick={() => setSearchOpen(false)}>
          <div className="px-4 py-3 glass-nav" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#a78bfa' }} />
                <input ref={mobileRef} autoFocus type="text" placeholder="Search anime..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(167,139,250,0.4)', color: '#e2e8f0' }} />
              </div>
            </form>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          onClick={() => setDrawerOpen(false)}
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn('fixed top-0 left-0 h-full z-[70] flex flex-col lg:hidden transition-transform duration-300 ease-out', drawerOpen ? 'translate-x-0' : '-translate-x-full')}
        style={{ width: 300, background: 'rgba(9,10,20,0.99)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation menu"
      >
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
          <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }} aria-label="Close menu">
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
              {isActive(href) && <ChevronRight className="w-4 h-4 shrink-0" />}
            </Link>
          ))}
        </nav>

        <div className="p-4 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-colors"
            style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366' }}>
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm leading-tight">Join Updates Channel</div>
              <div className="text-[11px] opacity-70">Get updates only</div>
            </div>
          </a>

          <a href={CONTACT_WA_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-colors"
            style={{ background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.15)', color: '#4ade80' }}>
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm leading-tight">Contact Developer</div>
              <div className="text-[11px] opacity-70">Chat on WhatsApp</div>
            </div>
          </a>

          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}>
            <GitHubIcon className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm leading-tight">Source Code</div>
              <div className="text-[11px] opacity-70">View on GitHub</div>
            </div>
          </a>
        </div>
      </aside>
    </>
  );
}
