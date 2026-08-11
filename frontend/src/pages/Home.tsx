import { useEffect, useRef, useState } from 'react';
import { fetchFoods, type FoodItem } from '../lib/api';
import { fetchCookListingsPublic, type CookListing } from '../lib/listings';
import FoodCard from '../components/FoodCard';
import CookListingsSection from '../components/CookListingsSection';
import FoodAroundMe from '../components/FoodAroundMe';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';
import ScrollHint from '../components/ScrollHint';
import { Home as HomeIcon, MapPin, ChefHat, Utensils } from 'lucide-react';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [cookListings, setCookListings] = useState<CookListing[]>([]);
  const [cooksLoading, setCooksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [minReady, setMinReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [view, setView] = useState<'home' | 'nearby' | 'cooks' | 'restaurants'>('home');
  const mainRef = useRef<HTMLElement>(null);

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
  }, [foods]);

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
        {view === 'cooks' && <CookListingsSection title='OyeWell Cooks' listings={cookListings} loading={cooksLoading} />}
        {view === 'nearby' && <FoodAroundMe />}
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
  current: 'home' | 'nearby' | 'cooks' | 'restaurants';
  onChange: (v: 'home' | 'nearby' | 'cooks' | 'restaurants') => void;
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'restaurants', label: 'Restaurants', icon: Utensils },
    { id: 'cooks', label: 'Cooks', icon: ChefHat },
    { id: 'nearby', label: 'Food Around Me', icon: MapPin },
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
