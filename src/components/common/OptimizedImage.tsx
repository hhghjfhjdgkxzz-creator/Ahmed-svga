import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaStorage';
import { isImageCached, markImageCached, markImageFailed } from '../../utils/imageCache';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  priority?: boolean;
  aspectRatioClass?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt = 'Image',
  priority = false,
  aspectRatioClass = 'aspect-square',
  containerClassName = '',
  className = '',
  fallbackIcon,
  ...props
}) => {
  const resolvedUrl = resolveMediaUrl(src);
  const alreadyCached = isImageCached(resolvedUrl);

  const [isLoaded, setIsLoaded] = useState<boolean>(alreadyCached);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(resolvedUrl);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    const directUrl = resolveMediaUrl(src);
    setCurrentSrc(directUrl);
    retryCountRef.current = 0;
    setHasError(false);

    if (isImageCached(directUrl)) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    markImageCached(currentSrc);
  };

  const handleError = () => {
    // 1. Try alternative extension if standard format failed
    if (retryCountRef.current === 0) {
      retryCountRef.current = 1;
      if (currentSrc.includes('.png')) {
        const webpUrl = currentSrc.replace(/\.png(\?.*)?$/i, '.webp$1');
        if (webpUrl !== currentSrc) {
          setCurrentSrc(webpUrl);
          return;
        }
      } else if (currentSrc.includes('.webp')) {
        const pngUrl = currentSrc.replace(/\.webp(\?.*)?$/i, '.png$1');
        if (pngUrl !== currentSrc) {
          setCurrentSrc(pngUrl);
          return;
        }
      }
    }

    markImageFailed(currentSrc);
    setHasError(true);
    setIsLoaded(true); // Stop skeleton
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${aspectRatioClass} ${containerClassName}`}
      style={{ contain: 'paint layout' }}
    >
      {/* 1. Shimmer Skeleton Placeholder (Strictly matches aspect ratio to avoid layout shift) */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 w-full h-full bg-[#0c101a] flex items-center justify-center pointer-events-none z-0">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-slate-800/20 to-transparent animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      )}

      {/* 2. Error Fallback State (Clean stylized placeholder, no broken layout) */}
      {hasError ? (
        <div className="absolute inset-0 w-full h-full bg-[#0d111c] flex flex-col items-center justify-center p-3 text-slate-500 z-10">
          {fallbackIcon || <ImageIcon className="w-8 h-8 opacity-40 mb-1" />}
          <span className="text-[10px] text-slate-500 text-center font-mono truncate max-w-[90%]">
            {alt}
          </span>
        </div>
      ) : (
        /* 3. Direct Native Media Image */
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' } : {})}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
};
