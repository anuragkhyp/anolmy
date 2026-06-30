import React, { useState, useEffect } from "react";

// High-performance image component with smooth fade-in and self-healing fallback
export function FadeInImage({
  src,
  alt,
  className,
  onError,
  fastLoad = true,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fastLoad?: boolean }) {
  const [isLoaded, setIsLoaded] = useState(fastLoad);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  // Extract raw URL if it's currently proxied
  const getRawUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith("/api/proxy?url=")) {
      try {
        return decodeURIComponent(url.split("/api/proxy?url=")[1].split("&")[0]);
      } catch (e) {
        return null;
      }
    }
    if (url.startsWith("https://wsrv.nl/?url=")) {
      try {
        return decodeURIComponent(url.split("https://wsrv.nl/?url=")[1]);
      } catch (e) {
        return null;
      }
    }
    if (url.startsWith("https://api.allorigins.win/raw?url=")) {
      try {
        return decodeURIComponent(url.split("https://api.allorigins.win/raw?url=")[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!src) {
      setCurrentSrc(null);
      return;
    }

    setCurrentSrc(src);

    if (!fastLoad) setIsLoaded(false);
    setHasError(false);
    setAttemptedFallback(false);
  }, [src, fastLoad]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!src) return;
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      const raw = getRawUrl(src);
      setCurrentSrc(raw || src); // fallback to raw or something else if needed
    } else {
      setHasError(true);
      if (onError) onError(e);
    }
  };

  const isAvatar = className?.includes("rounded-full");

  return (
    <div className={`relative overflow-hidden bg-[#121212] ${className || ""}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 bg-[#161616] flex flex-col items-center justify-center text-neutral-500">
          {isAvatar ? (
            <svg className="w-1/2 h-1/2 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 p-2">
              <svg className="w-8 h-8 opacity-40 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-[10px] tracking-wider text-neutral-500 font-medium">Failed to load</span>
            </div>
          )}
        </div>
      ) : (
        <img
          src={currentSrc || undefined}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          {...props}
        />
      )}
    </div>
  );
}
