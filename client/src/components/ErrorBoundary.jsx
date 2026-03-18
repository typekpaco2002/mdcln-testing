import React from 'react';
import { AlertTriangle, RefreshCw, Headset } from 'lucide-react';

const IS_PROD = import.meta.env.PROD;

async function reportErrorToAdmin(error, errorInfo, user) {
  try {
    // Read user from Zustand store directly (class components can't use hooks)
    let resolvedUser = user;
    if (!resolvedUser) {
      try {
        const { useAuthStore } = await import('../store');
        const state = useAuthStore.getState();
        resolvedUser = state?.user || null;
      } catch { /* ignore */ }
    }

    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        url: window.location.href,
        userId: resolvedUser?.id || null,
        userEmail: resolvedUser?.email || null,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // Silently swallow — we must never crash in the error handler
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reported: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Auto-report to admin in production (fire-and-forget)
    if (IS_PROD) {
      reportErrorToAdmin(error, errorInfo, null).then(() => {
        this.setState({ reported: true });
      });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, reported } = this.state;

    // ── Production: clean, user-friendly screen — NO stack traces ──────────────
    if (IS_PROD) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-2 leading-relaxed">
              An unexpected error occurred. Our team has been notified automatically.
            </p>
            {this.state.error?.message && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">Technical details</summary>
                <p className="mt-2 text-xs font-mono text-slate-500 break-words">{this.state.error.message}</p>
              </details>
            )}
            {reported && (
              <p className="text-xs text-purple-400 mb-6">
                ✓ Error report sent to support
              </p>
            )}
            {!reported && (
              <p className="text-xs text-gray-600 mb-6">
                Sending error report…
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <a
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition font-medium"
              >
                Go to Dashboard
              </a>

              <button
                disabled
                title="Support contact — coming soon"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-gray-600 cursor-not-allowed select-none"
              >
                <Headset className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Development: show full details for debugging ────────────────────────────
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full glass rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold mb-2 text-center">Oops! Something went wrong</h1>
          <p className="text-gray-400 mb-6 text-center text-sm">
            Dev mode — full error details shown below. These are hidden in production.
          </p>

          <div className="mb-6 p-4 bg-red-500/10 rounded-xl space-y-3">
            <p className="text-sm font-mono text-red-100">
              {error?.message || error?.toString() || 'Unknown error occurred'}
            </p>

            {errorInfo?.componentStack && (
              <details open>
                <summary className="text-xs text-red-300 cursor-pointer hover:text-red-100 mb-2">
                  Component Stack
                </summary>
                <pre className="text-xs text-red-100 p-2 bg-black/30 rounded overflow-x-auto max-h-48 mt-1">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {error?.stack && (
              <details open>
                <summary className="text-xs text-red-300 cursor-pointer hover:text-red-100 mb-2">
                  Stack Trace
                </summary>
                <pre className="text-xs text-red-100 p-2 bg-black/30 rounded overflow-x-auto max-h-48 mt-1">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>

            <button
              onClick={() => {
                const text = `REACT ERROR\n===========\nMessage: ${error?.message || error?.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}\n\nStack Trace:\n${error?.stack || 'N/A'}`.trim();
                navigator.clipboard.writeText(text);
              }}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              Copy Error
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
