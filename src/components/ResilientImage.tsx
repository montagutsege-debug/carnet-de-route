import { useState } from 'react';
import { Compass } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle?: string;
  className?: string;
  containerClassName?: string;
}

export function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E9E7DF] text-[#5C6268] p-6 text-center ${containerClassName}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-8 h-8 text-[#1E4D3B]/60 mb-3" strokeWidth={1.5} />
        <p className="font-serif text-base text-[#1C1F22]">
          {fallbackTitle || alt}
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#E9E7DF] ${containerClassName}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={className}
      />
    </div>
  );
}
