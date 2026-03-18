import { motion } from 'framer-motion';
import { Eye, Download, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Shared component for displaying generation results
 * Ensures consistent tab sizing and behavior across all generation types
 */
export default function GenerationResults({ 
  ongoingGenerations = [], 
  loading = false,
  type = 'image', // image, prompt, video, faceswap
  onPreview,
  onDownload
}) {
  const [activeResultTab, setActiveResultTab] = useState('generating');
  
  const hasOngoing = ongoingGenerations.length > 0;
  
  return (
    <div className="mt-8">
      {/* Tabs - Always same height */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveResultTab('generating')}
          data-testid="tab-generating"
          className={`
            flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 min-h-[48px]
            ${activeResultTab === 'generating'
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'glass-ultra'
            }
          `}
        >
          {(loading || hasOngoing) ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
          <span className="font-semibold">
            Generating {hasOngoing && `(${ongoingGenerations.length})`}
          </span>
        </button>
      </div>
      
      {/* Content */}
      <div className="min-h-[200px]">
        {activeResultTab === 'generating' && (
          <GeneratingContent 
            generations={ongoingGenerations}
            loading={loading}
            type={type}
            onPreview={onPreview}
            onDownload={onDownload}
          />
        )}
      </div>
    </div>
  );
}

function GeneratingContent({ generations, loading, type, onPreview, onDownload }) {
  if (loading && generations.length === 0) {
    return (
      <div className="glass-ultra rounded-xl p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
        <p className="text-gray-400">Checking for ongoing generations...</p>
      </div>
    );
  }
  
  if (generations.length === 0) {
    return (
      <div className="glass-ultra rounded-xl p-8 text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
        <p className="text-gray-400">No ongoing generations</p>
        <p className="text-sm text-gray-500 mt-2">
          Start a new generation above or check History for completed ones
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {generations.map((gen) => (
        <GenerationCard
          key={gen.id}
          generation={gen}
          type={type}
          onPreview={onPreview}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}

function GenerationCard({ generation, type, onPreview, onDownload }) {
  const isProcessing = generation.status === 'processing' || generation.status === 'pending';
  const isCompleted = generation.status === 'completed';
  const isFailed = generation.status === 'failed';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-ultra rounded-xl p-4"
    >
      {/* Thumbnail / Placeholder - Compact on desktop */}
      <div className="relative aspect-[4/3] md:aspect-[3/2] lg:h-28 lg:aspect-auto rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
        {isCompleted && generation.outputUrl ? (
          <>
            {type === 'video' || type === 'faceswap' ? (
              <video 
                src={generation.outputUrl} 
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
              />
            ) : (
              <img 
                src={generation.outputUrl} 
                alt="Generated" 
                className="w-full h-full object-cover"
              />
            )}
            {/* Preview Overlay */}
            <div className="absolute inset-0 bg-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onPreview && (
                <button
                  onClick={() => onPreview(generation)}
                  data-testid={`button-preview-${generation.id}`}
                  className="p-2 bg-white/15 rounded-lg hover:bg-white/25 transition-colors border border-white/10"
                >
                  <Eye className="w-5 h-5" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(generation)}
                  data-testid={`button-download-${generation.id}`}
                  className="p-2 bg-white/15 rounded-lg hover:bg-white/25 transition-colors border border-white/10"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isProcessing && (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-400" />
                <span className="text-sm text-gray-400">Processing...</span>
              </>
            )}
            {isFailed && (
              <>
                <AlertTriangle className="w-8 h-8 mb-2 text-red-400" />
                <span className="text-sm text-red-400">Failed</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              Processing
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              Completed
            </span>
          )}
          {isFailed && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
              Failed
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(generation.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      {/* Prompt snippet (if available) */}
      {generation.prompt && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
          {generation.prompt}
        </p>
      )}
      
      {/* Error message (if failed) */}
      {isFailed && generation.errorMessage && (
        <p className="text-xs text-red-400 mt-2">
          {generation.errorMessage}
        </p>
      )}
    </motion.div>
  );
}
