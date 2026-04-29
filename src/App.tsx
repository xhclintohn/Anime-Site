import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
  import { HelmetProvider } from "react-helmet-async";
  import { useEffect } from "react";
  import HomePage from "./pages/HomePage";
  import SearchPage from "./pages/SearchPage";
  import AnimeListPage from "./pages/AnimeListPage";
  import GenreListPage from "./pages/GenreListPage";
  import AnimeDetailPage from "./pages/AnimeDetailPage";
  import StreamPage from "./pages/StreamPage";
  import HistoryPage from "./pages/HistoryPage";
  import NotFound from "./pages/NotFound";

  const queryClient = new QueryClient();

  function ScrollAnimationObserver() {
    const location = useLocation();
    useEffect(() => {
      const setup = () => {
        const elements = document.querySelectorAll('.scroll-fade');
        if (!elements.length) return () => {};
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                entry.target.classList.remove('out-view');
              } else {
                entry.target.classList.remove('in-view');
                entry.target.classList.add('out-view');
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
      };
      const id = setTimeout(setup, 80);
      return () => clearTimeout(id);
    }, [location.pathname]);
    return null;
  }

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ScrollAnimationObserver />
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