import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart } from '@phosphor-icons/react';
import analytics from '../utils/analytics';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    analytics.page('Auth', 'Login', { path: '/login', title: 'HomeCart — Sign In' });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A3626] rounded-2xl mb-4">
            <ShoppingCart size={32} weight="duotone" className="text-[#FDFBF7]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#1A3626] font-heading mb-2">Welcome back</h1>
          <p className="text-[#4A5D4E]">Sign in to your HomeCart account</p>
        </div>

        <div className="bg-white border border-[#E8E5DC] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-[#D90429]/10 border border-[#D90429] text-[#D90429] rounded-lg px-4 py-3 text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-3 text-lg focus:outline-none focus:border-[#1A3626] transition-colors rounded-none placeholder:text-[#8F9C93]"
                placeholder="you@example.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-3 text-lg focus:outline-none focus:border-[#1A3626] transition-colors rounded-none placeholder:text-[#8F9C93]"
                placeholder="Enter your password"
                required
                data-testid="password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A3626] text-[#FDFBF7] rounded-lg px-6 py-3 font-medium transition-colors hover:bg-[#2D6A4F] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-button"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#4A5D4E]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#1A3626] font-semibold hover:text-[#FF6B35]" data-testid="register-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
