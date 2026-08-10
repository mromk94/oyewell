import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Home, ChefHat, Bike, Shield, LogOut, X, ArrowRight } from 'lucide-react';
import { useAuth, hasRole } from '../lib/auth';

export default function AccountButton() {
  const { isAuthenticated, customer, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleMainClick() {
    if (isAuthenticated) {
      setOpen((v) => !v);
    } else {
      openAuth();
    }
  }

  const isAdmin = hasRole(customer, 'ADMIN');
  const isCook = hasRole(customer, 'COOK');
  const isRider = hasRole(customer, 'RIDER');

  return (
    <div ref={ref} className='fixed right-4 top-4 z-50'>
      <button
        onClick={handleMainClick}
        className='flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-lg backdrop-blur-md transition hover:bg-white/10'
        aria-label='Menu'
      >
        {open ? <X className='h-5 w-5' /> : <User className='h-5 w-5' />}
      </button>

      {open && (
        <div className='absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-brand-900/95 p-2 shadow-2xl backdrop-blur-xl'>
          <Link
            to='/'
            onClick={() => setOpen(false)}
            className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10'
          >
            <Home className='h-4 w-4' /> Home
          </Link>
          <Link
            to='/account'
            onClick={() => setOpen(false)}
            className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10'
          >
            <User className='h-4 w-4' /> Account
          </Link>
          {isCook && (
            <Link
              to='/cook'
              onClick={() => setOpen(false)}
              className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-white/10'
            >
              <ChefHat className='h-4 w-4' /> Cook portal
            </Link>
          )}
          {isRider && (
            <Link
              to='/rider'
              onClick={() => setOpen(false)}
              className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-white/10'
            >
              <Bike className='h-4 w-4' /> Rider portal
            </Link>
          )}
          {isAdmin && (
            <Link
              to='/admin'
              onClick={() => setOpen(false)}
              className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-yellow-300 transition hover:bg-white/10'
            >
              <Shield className='h-4 w-4' /> Admin
            </Link>
          )}
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className='mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-red-500/20 hover:text-red-300'
            >
              <LogOut className='h-4 w-4' /> Sign out
            </button>
          ) : (
            <button
              onClick={() => {
                openAuth();
                setOpen(false);
              }}
              className='mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10'
            >
              <ArrowRight className='h-4 w-4' /> Sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}
