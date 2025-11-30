'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type AvatarContextValue = {
  imageLoadingStatus: 'idle' | 'loading' | 'loaded' | 'error';
  setImageLoadingStatus: (status: 'idle' | 'loading' | 'loaded' | 'error') => void;
};

const AvatarContext = React.createContext<AvatarContextValue>({
  imageLoadingStatus: 'idle',
  setImageLoadingStatus: () => {}
});

type AvatarProps = React.HTMLAttributes<HTMLDivElement>;

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => {
    const [imageLoadingStatus, setImageLoadingStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    
    return (
      <AvatarContext.Provider value={{ imageLoadingStatus, setImageLoadingStatus }}>
        <div
          ref={ref}
          className={cn(
            'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
            className
          )}
          {...props}
        />
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = 'Avatar';

type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onError, onLoad, ...props }, ref) => {
    const context = React.useContext(AvatarContext);
    const [imgSrc, setImgSrc] = React.useState<string | undefined>(src);

    React.useEffect(() => {
      if (src) {
        context.setImageLoadingStatus('loading');
        setImgSrc(src);
      } else {
        context.setImageLoadingStatus('error');
      }
    }, [src, context]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      context.setImageLoadingStatus('loaded');
      onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      context.setImageLoadingStatus('error');
      onError?.(e);
    };

    if (!imgSrc || context.imageLoadingStatus === 'error') {
      return null;
    }

    return (
      <img
        ref={ref}
        src={imgSrc}
        alt={alt || ''}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'aspect-square h-full w-full object-cover',
          context.imageLoadingStatus === 'loaded' ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement>;

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(AvatarContext);
    
    if (context.imageLoadingStatus === 'loaded') {
      return null;
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-900 text-sm font-medium',
          className
        )}
        {...props}
      />
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };