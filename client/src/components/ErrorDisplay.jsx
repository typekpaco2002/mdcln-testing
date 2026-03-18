import { useState, useEffect } from 'react';
import { X, Copy, AlertTriangle } from 'lucide-react';
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
          className="bg-red-500/10 backdrop-blur-sm border-2 border-red-500 rounded-lg p-4 shadow-2xl animate-in slide-in-from-right"
          data-testid={`error-popup-${error.id}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-red-300">Error Occurred</h3>
                <button
                  onClick={() => dismissError(error.id)}
                  className="text-red-300 hover:text-red-100 transition"
                  data-testid="button-dismiss-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error.context && (
                <p className="text-xs text-red-200/70 mb-1">
                  Context: {error.context}
                </p>
              )}

              <p className="text-sm text-red-100 font-mono mb-2 break-words">
                {error.message}
              </p>

              {error.status && (
                <p className="text-xs text-red-200/70 mb-2">
                  HTTP {error.status}: {error.method} {error.url}
                </p>
              )}

              {error.apiData && (
                <div className="mb-2 p-2 bg-black/20 rounded text-xs text-red-100 font-mono max-h-24 overflow-y-auto">
                  {JSON.stringify(error.apiData, null, 2)}
                </div>
              )}

              {error.stack && (
                <details className="mb-2">
                  <summary className="text-xs text-red-300 cursor-pointer hover:text-red-100">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-red-100 mt-1 p-2 bg-black/20 rounded overflow-x-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}

              <button
                onClick={() => copyError(error)}
                className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded transition"
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
