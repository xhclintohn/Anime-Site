import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import { HelmetProvider } from "react-helmet-async";
  import { useEffect, useState } from "react";
  import { Zap } from "lucide-react";
  import HomePage from "./pages/HomePage";
  import SearchPage from "./pages/SearchPage";
  import AnimeListPage from "./pages/AnimeListPage";
  import GenreListPage from "./pages/GenreListPage";
  import AnimeDetailPage from "./pages/AnimeDetailPage";
  import StreamPage from "./pages/StreamPage";
  import HistoryPage from "./pages/HistoryPage";
  import NotFound from "./pages/NotFound";

  const queryClient = new QueryClient();

  function Preloader() {
    const [hidden, setHidden] = useState(false);
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
      const t1 = setTimeout(() => setHidden(true), 1400);
      const t2 = setTimeout(() => setMounted(false), 3200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    if (!mounted) return null;

    return (
      <div className={`preloader ${hidden ? 'preloader-hidden' : ''}`}>
        <div className="preloader-dots">
          <span className="preloader-dot" style={{ background: 'hsl(192 100% 52%)', animationDelay: '0s' }} />
          <span className="preloader-dot" style={{ background: 'hsl(210 100% 68%)', animationDelay: '.1s' }} />
          <span className="preloader-dot" style={{ background: 'hsl(270 80% 72%)', animationDelay: '.2s' }} />
          <span className="preloader-dot" style={{ background: 'hsl(192 100% 52%)', animationDelay: '.3s' }} />
          <span className="preloader-dot" style={{ background: 'hsl(210 100% 68%)', animationDelay: '.4s' }} />
        </div>
        <div className="preloader-logo">
          Toxi<span>Nime</span>
        </div>
      </div>
    );
  }

  function ScrollFadeObserver() {
    useEffect(() => {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('in-view');
          });
        },
        { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
      );
      const observe = () => {
        document.querySelectorAll('.scroll-fade:not(.in-view)').forEach((el) => io.observe(el));
      };
      observe();
      const mo = new MutationObserver(observe);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => { io.disconnect(); mo.disconnect(); };
    }, []);
    return null;
  }

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Preloader />
            <ScrollFadeObserver />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/genres" element={<GenreListPage />} />
              <Route path="/anime/:id" element={<AnimeDetailPage />} />
              <Route path="/anime/list/:type" element={<AnimeListPage />} />
              <Route path="/watch/:animeId/:episodeId" element={<StreamPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );

  export default App;