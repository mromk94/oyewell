import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function AccountButton() {
  const navigate = useNavigate();
  const { isAuthenticated, openAuth } = useAuth();

  function handleClick() {
    if (isAuthenticated) {
      navigate('/account');
    } else {
      openAuth();
    }
  }

  return (
    <button
      onClick={handleClick}
      className='fixed right-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-lg backdrop-blur-md transition hover:bg-white/10'
      aria-label='Account'
    >
      <User className='h-5 w-5' />
    </button>
  );
}
