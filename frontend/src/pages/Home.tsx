import { useEffect, useRef, useState } from 'react';
import { fetchFoods, type FoodItem } from '../lib/api';
import FoodCard from '../components/FoodCard';
import Logo from '../components/Logo';
import ScrollHint from '../components/ScrollHint';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchFoods()
      .then((data) => {
        setFoods(data.foods);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
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

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
      </div>
    );
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
      </main>
      <ScrollHint
        canScrollUp={canScrollUp}
        canScrollDown={canScrollDown}
        onNavigate={handleNavigate}
      />
    </>
  );
}
