import { useEffect, useRef, useState } from 'react';
import { fetchFoods, type FoodItem } from '../lib/api';
import { fetchCookListingsPublic, type CookListing } from '../lib/listings';
import FoodCard from '../components/FoodCard';
import CookListingsSection from '../components/CookListingsSection';
import FoodAroundMe from '../components/FoodAroundMe';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';
import ScrollHint from '../components/ScrollHint';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [cookListings, setCookListings] = useState<CookListing[]>([]);
  const [cooksLoading, setCooksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [minReady, setMinReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
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
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="h-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {foods.map((food) => (
          <FoodCard key={food.id} food={food} />
        ))}
        <CookListingsSection
          title='Home Cooks Near You'
          listings={cookListings}
          loading={cooksLoading}
        />
        <FoodAroundMe />
      </main>
      <ScrollHint
        canScrollUp={canScrollUp}
        canScrollDown={canScrollDown}
        onNavigate={handleNavigate}
      />
    </>
  );
}
