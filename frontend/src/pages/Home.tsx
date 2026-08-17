import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchFoods, type FoodItem } from '../lib/api';
import { fetchCookListingsPublic, type CookListing } from '../lib/listings';
import FoodCard from '../components/FoodCard';
import FoodAroundMe from '../components/FoodAroundMe';
import CookListingFeed from '../components/CookListingFeed';
import DiscoveryFilters, { type DiscoveryFiltersState } from '../components/DiscoveryFilters';
import { fetchCoveredRegions, type PublicRegion } from '../lib/regionsPublic';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';
import ScrollHint from '../components/ScrollHint';
import { Home as HomeIcon, MapPin, ChefHat, Utensils, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, hasRole } from '../lib/auth';

export default function Home() {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const isCook = customer ? hasRole(customer, 'COOK') : false;
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [cookListings, setCookListings] = useState<CookListing[]>([]);
  const [cooksLoading, setCooksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [minReady, setMinReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [view, setView] = useState<'home' | 'cooks' | 'restaurants' | 'nearby'>('home');
  const [reps, setReps] = useState(1);
  const [postModal, setPostModal] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFiltersState>({ q: '', cuisine: '', maxPrice: '', available: false, regionId: '' });
  const [regions, setRegions] = useState<PublicRegion[]>([]);
  const mainRef = useRef<HTMLElement>(null);
  const isAppending = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetchCoveredRegions().then(setRegions).catch(() => {});
  }, []);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinReady(true), 2500);
    Promise.all([
      fetchFoods(),
      fetchCookListingsPublic({ take: 20, regionId: filters.regionId || undefined }),
    ])
      .then(([data, listings]) => {
        setFoods(data.foods);
        setCookListings(listings.listings);
        setCooksLoading(false);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setCooksLoading(false);
        setLoading(false);
      });
    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 10);
  }, [view, foods, cookListings]);

  useEffect(() => {
    setReps(1);
    isAppending.current = false;
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [view, filters.q, filters.cuisine, filters.maxPrice, filters.available, filters.regionId]);

  function handleScroll() {
    const el = mainRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 10);
    if (view === 'nearby' || isAppending.current) return;
    const count = view === 'cooks' ? filteredCookListings.length : filteredFoods.length;
    if (count < 2 || !el.clientHeight) return;
    const totalHeight = reps * count * el.clientHeight;
    if (el.scrollTop + el.clientHeight >= totalHeight - 100) {
      isAppending.current = true;
      setReps((r) => r + 1);
    }
  }

  useEffect(() => {
    isAppending.current = false;
  }, [reps]);

  function handleViewChange(next: 'home' | 'cooks' | 'restaurants' | 'nearby') {
    setView(next);
    setReps(1);
    isAppending.current = false;
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleNavigate(direction: 'up' | 'down') {
    const el = mainRef.current;
    if (!el) return;
    const distance = direction === 'down' ? el.clientHeight : -el.clientHeight;
    el.scrollBy({ top: distance, behavior: 'smooth' });
  }

  const filteredFoods = useMemo(() => {
    let list = foods;
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }
    if (filters.available) {
      list = list.filter((f) => f.isAvailable);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice) * 100;
      list = list.filter((f) => !f.priceFromKobo || f.priceFromKobo <= max);
    }
    return list;
  }, [foods, filters]);

  useEffect(() => {
    if (view !== 'cooks' && view !== 'restaurants') return;
    setCooksLoading(true);
    fetchCookListingsPublic({ take: 20, regionId: filters.regionId || undefined })
      .then((listings) => setCookListings(listings.listings))
      .catch(() => setError('Failed to load listings'))
      .finally(() => setCooksLoading(false));
  }, [filters.regionId]);

  const filteredCookListings = useMemo(() => {
    let list = cookListings;
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          l.cook.displayName.toLowerCase().includes(q)
      );
    }
    if (filters.cuisine) {
      list = list.filter((l) => l.cuisine && l.cuisine.toLowerCase() === filters.cuisine.toLowerCase());
    }
    if (filters.available) {
      list = list.filter((l) => l.isActive && l.stock > 0);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice) * 100;
      list = list.filter((l) => l.priceKobo <= max);
    }
    return list;
  }, [cookListings, filters]);

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    cookListings.forEach((l) => l.cuisine && set.add(l.cuisine));
    return Array.from(set).sort();
  }, [cookListings]);

  if (loading || !minReady) {
    return <Preloader />;
  }

  if (error || !foods.length) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-black text-white">OYE Well</h1>
        <p className="mt-4 max-w-md text-lg text-white/70">
          {error ? `Something went wrong: ${error}` : 'The kitchen is preparing the menu. Check back soon.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <Logo />
      <div className="fixed left-0 right-0 top-20 z-30 flex justify-center bg-gradient-to-b from-black/70 via-black/40 to-transparent pb-6 pt-3">
        <DiscoveryNav current={view} onChange={handleViewChange} />
      </div>
      <DiscoveryFilters view={view} filters={filters} onChange={setFilters} cuisines={cuisines} regions={regions} />
      <main
        ref={mainRef}
        onScroll={handleScroll}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          touchStart.current = null;
          if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
          const tabs = ['home', 'cooks', 'restaurants', 'nearby'] as const;
          const idx = tabs.indexOf(view);
          if (dx < 0 && idx < tabs.length - 1) setView(tabs[idx + 1]);
          if (dx > 0 && idx > 0) setView(tabs[idx - 1]);
        }}
        className="h-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {view === 'home' && (
          <>
            {Array.from({ length: reps }).flatMap((_, rep) =>
              filteredFoods.map((food) => <FoodCard key={`${food.id}-${rep}`} food={food} />)
            )}
          </>
        )}
        {view === 'restaurants' &&
          Array.from({ length: reps }).flatMap((_, rep) =>
            filteredFoods.map((food) => <FoodCard key={`${food.id}-${rep}`} food={food} />)
          )}
        {view === 'cooks' && (
          <>
            <CookListingFeed listings={Array.from({ length: reps }).flatMap(() => filteredCookListings)} loading={cooksLoading} />
            <button
              onClick={() => setPostModal(true)}
              className='fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg transition hover:scale-105'
              aria-label='Post food'
            >
              <Plus className='h-6 w-6' />
            </button>
          </>
        )}
        {view === 'nearby' && (
          <div className="min-h-screen pt-28">
            <FoodAroundMe filters={filters} />
          </div>
        )}
      </main>
      <ScrollHint
        canScrollUp={canScrollUp}
        canScrollDown={canScrollDown}
        onNavigate={handleNavigate}
      />

      {postModal &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4'
            onClick={() => setPostModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-md rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'
            >
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-black text-white'>Post your food</h2>
                <button
                  onClick={() => setPostModal(false)}
                  className='rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
                  aria-label='Close'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <p className='mt-4 text-white/70'>
                This is where home cooks share dishes with people nearby. You can set your own price,
                choose when you're cooking, and customers can order straight from your listing.
              </p>
              <p className='mt-3 text-white/70'>
                To keep quality and safety in check, every cook goes through a quick application before they can start posting.
              </p>
              <div className='mt-6 flex flex-col gap-3'>
                {isCook ? (
                  <button
                    onClick={() => { setPostModal(false); navigate('/cook?tab=add'); }}
                    className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400'
                  >
                    <Plus className='h-4 w-4' /> Post a new dish
                  </button>
                ) : (
                  <button
                    onClick={() => { setPostModal(false); navigate('/cook'); }}
                    className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400'
                  >
                    <ChefHat className='h-4 w-4' /> Apply to become a cook
                  </button>
                )}
                <button
                  onClick={() => setPostModal(false)}
                  className='rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10'
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function DiscoveryNav({
  current,
  onChange,
}: {
  current: 'home' | 'cooks' | 'restaurants' | 'nearby';
  onChange: (v: 'home' | 'cooks' | 'restaurants' | 'nearby') => void;
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'cooks', label: 'Food', icon: ChefHat },
    { id: 'restaurants', label: 'Restaurants', icon: Utensils },
    { id: 'nearby', label: 'Around Me', icon: MapPin },
  ] as const;

  return (
    <nav className="inline-flex rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            current === t.id
              ? 'bg-white text-black'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <t.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t.label}</span>
          <span className="sm:hidden">{t.label.split(' ')[0]}</span>
        </button>
      ))}
    </nav>
  );
}
