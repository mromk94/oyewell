import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register({ email, password, firstName, lastName, phone });
      navigate('/account');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-white">Create an account</h1>
        <p className="mt-2 text-white/60">Save your details and track orders.</p>
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
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
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link to="/login" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
