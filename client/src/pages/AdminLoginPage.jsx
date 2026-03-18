import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store';
import { queryClient } from '../lib/queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

/**
 * Handles admin impersonation login links: /admin-login?token=...
 * Calls the API to set auth cookies, then redirects to dashboard and refreshes auth state.
 */
export default function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const refreshUserCredits = useAuthStore((s) => s.refreshUserCredits);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('Missing login link. Use the link from the admin panel.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Remove sensitive token from URL as early as possible.
        window.history.replaceState({}, document.title, '/admin-login');
        const url = `${API_PREFIX}/auth/impersonate-login?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus('error');
          setError(data?.error || data?.message || `Request failed (${res.status})`);
          return;
        }
        if (!data.success) {
          setStatus('error');
          setError(data?.error || 'Login failed');
          return;
        }
        setStatus('success');
        // Refresh auth state from server (cookies are now set)
        const profileRes = await fetch(`${API_PREFIX}/auth/profile`, { credentials: 'include' });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.user) {
            setAuth(profileData.user);
            queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
            queryClient.invalidateQueries({ queryKey: ['/api/models'] });
            queryClient.invalidateQueries({ queryKey: ['/api/generations'] });
            refreshUserCredits?.();
          }
        }
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err?.message || 'Network error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, navigate, setAuth, refreshUserCredits]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-white/70 mb-4" />
          <p className="text-slate-400">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-red-200 mb-2">Login link invalid or expired</h1>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <a href="/" className="text-sm text-white underline">Return home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <Loader2 className="w-8 h-8 animate-spin text-white/70" />
    </div>
  );
}
