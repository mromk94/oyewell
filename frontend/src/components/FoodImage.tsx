import { useState, useEffect } from 'react';

interface FoodImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className = '' }: FoodImageProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setReady(false);
    setError(false);
  }, [src]);

  if (error || !src?.trim()) {
    return (
      <div className={`${className} flex items-center justify-center bg-brand-800`}>
        <span className="text-xs text-white/50">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden`}>
      {!ready && (
        <div className="absolute inset-0 z-10 animate-pulse bg-white/10" />
      )}
      <img
        src={src}
        alt={alt}
        loading="eager"
        onLoad={() => setReady(true)}
        onError={() => setError(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
