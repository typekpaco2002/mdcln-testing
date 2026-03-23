import { useState, useEffect, useRef } from 'react';
import { Volume2, Pause, Check, X } from 'lucide-react';
import api from '../services/api';

export default function VoiceTestPage() {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [playingType, setPlayingType] = useState(null);
  const [language, setLanguage] = useState('en');
  const audioRef = useRef(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const response = await api.get('/voices');
      if (response.data.success) {
        setVoices(response.data.voices);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const playVoice = (voice, type) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.id && playingType === type) {
      setPlayingId(null);
      setPlayingType(null);
      return;
    }

    let audioUrl;
    if (type === 'original') {
      audioUrl = voice.originalPreviewUrl;
    } else {
      audioUrl = voice.previewUrls?.[language];
    }
    
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingId(voice.id);
    setPlayingType(type);

    audio.play().catch(console.error);
    audio.onended = () => {
      setPlayingId(null);
      setPlayingType(null);
      audioRef.current = null;
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading voices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Voice Preview Comparison</h1>
        <p className="text-gray-400 mb-6">
          Compare the <span className="text-blue-400">original provider preview</span> with <span className="text-green-400">our cached preview</span>. 
          They should sound like the same person.
        </p>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <p className="text-amber-400 text-sm">
            <strong>How to verify:</strong> Click "Original" to hear the official provider preview, then click "Our Version" - 
            the voice should sound the same (different words, but same person). If they sound like different people, that's a mismatch.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <span className="text-gray-400 text-sm py-2">Our version language:</span>
          {['en', 'sk', 'cs'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                language === lang
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {voices.map((voice, index) => (
            <div
              key={voice.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="text-gray-500 w-6 text-center font-mono text-sm">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{voice.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {voice.labels?.accent || 'AI Voice'} | ID: {voice.id.slice(0, 8)}...
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => playVoice(voice, 'original')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    playingId === voice.id && playingType === 'original'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
                >
                  {playingId === voice.id && playingType === 'original' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  Original
                </button>

                <button
                  onClick={() => playVoice(voice, 'cached')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    playingId === voice.id && playingType === 'cached'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {playingId === voice.id && playingType === 'cached' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  Our Version ({language.toUpperCase()})
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            <strong>If all voices match:</strong> The previews are correctly set up and ready to use!
          </p>
        </div>
      </div>
    </div>
  );
}
