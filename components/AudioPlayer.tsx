'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioBase64: string;
  mimeType: string;
}

export default function AudioPlayer({ audioBase64, mimeType }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Create audio URL from base64
  useEffect(() => {
    // Clean up previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Create new Blob and URL
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    // Cleanup on unmount
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBase64, mimeType]);

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up noise-overlay">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            Ses Kaydı
          </span>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Play/Pause Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={togglePlay}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center group"
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Seek Bar */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-primary-500 hover:accent-primary-600 transition-all"
          style={{
            background: `linear-gradient(to right, #FF7F50 0%, #FF7F50 ${(currentTime / duration) * 100}%, #E7E5E4 ${(currentTime / duration) * 100}%, #E7E5E4 100%)`
          }}
        />
      </div>

      {/* Playback Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">Hız:</span>
        {[0.9, 1.0, 1.1].map((rate) => (
          <button
            key={rate}
            onClick={() => changePlaybackRate(rate)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              playbackRate === rate
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-600'
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Waveform Visual Effect */}
      <div className="flex items-center justify-center gap-1 h-12">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isPlaying ? 'bg-primary-400' : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
            style={{
              height: isPlaying
                ? `${Math.random() * 100}%`
                : '20%',
              animation: isPlaying
                ? `pulse ${0.5 + Math.random()}s ease-in-out infinite alternate`
                : 'none',
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
