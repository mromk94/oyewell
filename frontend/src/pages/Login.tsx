import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/account');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-6">
      <Logo />
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-white/60">Sign in to your OYE Well account.</p>
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-white py-3 font-bold text-black"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          Don't have an account?{' '}
          <Link to="/register" className="text-white underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
