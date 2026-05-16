import { useState, useEffect } from 'react';
import { X, Copy, AlertTriangle } from '@/components/icons';
import toast from 'react-hot-toast';

// Global error store
let errorDisplayCallback = null;

// Check if we're in production
const isProduction = import.meta.env.PROD;

export function showErrorDetails(error, context = '') {
  // In production, don't show detailed error popups - just log to console
  if (isProduction) {
    console.error('Error:', error?.message || error);
    return;
  }
  
  if (errorDisplayCallback) {
    errorDisplayCallback(error, context);
  }
}

export function ErrorDisplay() {
  const [errors, setErrors] = useState([]);

  // Don't render anything in production
  if (isProduction) {
    return null;
  }

  useEffect(() => {
    // Register the callback
    errorDisplayCallback = (error, context) => {
      const errorInfo = {
        id: Date.now(),
        message: error?.message || String(error),
        stack: error?.stack || '',
        context,
        timestamp: new Date().toISOString(),
        // API error details
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        apiData: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method,
      };
      
      setErrors(prev => [errorInfo, ...prev]);
    };

    return () => {
      errorDisplayCallback = null;
    };
  }, []);

  const dismissError = (id) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const copyError = (error) => {
    const errorText = `
ERROR DETAILS
=============
Time: ${error.timestamp}
Context: ${error.context || 'N/A'}

Message: ${error.message}

${error.status ? `HTTP Status: ${error.status} ${error.statusText || ''}` : ''}
${error.url ? `URL: ${error.method} ${error.url}` : ''}
${error.apiData ? `Response: ${JSON.stringify(error.apiData, null, 2)}` : ''}

Stack Trace:
${error.stack}
    `.trim();

    navigator.clipboard.writeText(errorText);
    toast.success('Error copied to clipboard!');
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md space-y-2">
      {errors.map(error => (
        <div
          key={error.id}
          className="rounded-xl p-4 animate-in slide-in-from-right"
          style={{
            background: 'color-mix(in srgb, var(--danger) 8%, var(--bg-content))',
            border: '1px solid color-mix(in srgb, var(--danger) 36%, transparent)',
            boxShadow: '0 10px 28px var(--shadow-ambient)',
            color: 'var(--text-primary)',
          }}
          data-testid={`error-popup-${error.id}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-[13px] tracking-tight" style={{ color: 'var(--danger)' }}>Error Occurred</h3>
                <button
                  onClick={() => dismissError(error.id)}
                  className="transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                  data-testid="button-dismiss-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error.context && (
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Context: {error.context}
                </p>
              )}

              <p className="text-[13px] font-mono mb-2 break-words" style={{ color: 'var(--text-primary)' }}>
                {error.message}
              </p>

              {error.status && (
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  HTTP {error.status}: {error.method} {error.url}
                </p>
              )}

              {error.apiData && (
                <div
                  className="mb-2 p-2 rounded text-xs font-mono max-h-24 overflow-y-auto"
                  style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}
                >
                  {JSON.stringify(error.apiData, null, 2)}
                </div>
              )}

              {error.stack && (
                <details className="mb-2">
                  <summary className="text-xs cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                    Stack Trace
                  </summary>
                  <pre className="text-xs mt-1 p-2 rounded overflow-x-auto max-h-32" style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
                    {error.stack}
                  </pre>
                </details>
              )}

              <button
                onClick={() => copyError(error)}
                className="btn-outline"
                style={{ padding: '6px 10px', fontSize: 12 }}
                data-testid="button-copy-error"
              >
                <Copy className="w-3 h-3" />
                Copy Error Details
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
