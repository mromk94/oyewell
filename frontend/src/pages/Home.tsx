import { useEffect, useRef, useState } from 'react';
import { fetchFoods, type FoodItem } from '../lib/api';
import { fetchCookListingsPublic, type CookListing } from '../lib/listings';
import FoodCard from '../components/FoodCard';
import CookListingsSection from '../components/CookListingsSection';
import FoodAroundMe from '../components/FoodAroundMe';
import CookListingFeed from '../components/CookListingFeed';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';
import ScrollHint from '../components/ScrollHint';
import { Home as HomeIcon, MapPin, ChefHat, Utensils, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [cookListings, setCookListings] = useState<CookListing[]>([]);
  const [cooksLoading, setCooksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [minReady, setMinReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [view, setView] = useState<'home' | 'cooks' | 'restaurants' | 'nearby'>('home');
  const mainRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinReady(true), 2500);
    Promise.all([
      fetchFoods(),
      fetchCookListingsPublic({ take: 20 }),
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

  function handleScroll() {
    const el = mainRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 10);
  }

  function handleNavigate(direction: 'up' | 'down') {
    const el = mainRef.current;
    if (!el) return;
    const distance = direction === 'down' ? el.clientHeight : -el.clientHeight;
    el.scrollBy({ top: distance, behavior: 'smooth' });
  }

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
        <DiscoveryNav current={view} onChange={setView} />
      </div>
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
            {foods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
            <CookListingsSection title='Home Cooks' listings={cookListings} loading={cooksLoading} />
            <FoodAroundMe />
          </>
        )}
        {view === 'restaurants' && foods.map((food) => <FoodCard key={food.id} food={food} />)}
        {view === 'cooks' && (
          <>
            <CookListingFeed listings={cookListings} loading={cooksLoading} />
            <Link
              to='/cook?tab=add'
              className='fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg transition hover:scale-105'
              aria-label='Post food'
            >
              <Plus className='h-6 w-6' />
            </Link>
          </>
        )}
        {view === 'nearby' && (
          <div className="min-h-screen pt-28">
            <FoodAroundMe />
          </div>
        )}
      </main>
      <ScrollHint
        canScrollUp={canScrollUp}
        canScrollDown={canScrollDown}
        onNavigate={handleNavigate}
      />
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
