import React from 'react';
import { AlertTriangle, RefreshCw, Headset } from '@/components/icons';

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
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
        >
          <div className="max-w-md w-full text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: 'var(--danger)' }} />
            </div>

            <h1 className="text-[22px] font-semibold mb-3 tracking-tight" style={{ letterSpacing: '-0.01em' }}>
              Something went wrong
            </h1>
            <p className="text-[14px] mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred. Our team has been notified automatically.
            </p>
            {this.state.error?.message && (
              <details className="mb-4 text-left">
                <summary className="text-xs cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                  Technical details
                </summary>
                <p className="mt-2 text-xs font-mono break-words" style={{ color: 'var(--text-muted)' }}>
                  {this.state.error.message}
                </p>
              </details>
            )}
            <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>
              {reported ? '✓ Error report sent to support' : 'Sending error report…'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <a href="/dashboard" className="btn-outline">
                Go to Dashboard
              </a>

              <button disabled title="Support contact — coming soon" className="btn-ghost" style={{ opacity: 0.5 }}>
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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <div className="max-w-2xl w-full panel p-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
          </div>

          <h1 className="text-[20px] font-semibold mb-2 text-center tracking-tight" style={{ letterSpacing: '-0.01em' }}>
            Oops! Something went wrong
          </h1>
          <p className="mb-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Dev mode — full error details shown below. Hidden in production.
          </p>

          <div
            className="mb-6 p-4 rounded-xl space-y-3"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 22%, transparent)',
            }}
          >
            <p className="text-[13px] font-mono" style={{ color: 'var(--text-primary)' }}>
              {error?.message || error?.toString() || 'Unknown error occurred'}
            </p>

            {errorInfo?.componentStack && (
              <details open>
                <summary className="text-xs cursor-pointer mb-2" style={{ color: 'var(--text-muted)' }}>
                  Component Stack
                </summary>
                <pre className="text-xs p-2 rounded overflow-x-auto max-h-48 mt-1" style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {error?.stack && (
              <details open>
                <summary className="text-xs cursor-pointer mb-2" style={{ color: 'var(--text-muted)' }}>
                  Stack Trace
                </summary>
                <pre className="text-xs p-2 rounded overflow-x-auto max-h-48 mt-1" style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            <button
              onClick={() => {
                const text = `REACT ERROR\n===========\nMessage: ${error?.message || error?.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}\n\nStack Trace:\n${error?.stack || 'N/A'}`.trim();
                navigator.clipboard.writeText(text);
              }}
              className="btn-outline"
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
