import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback({
  src,
  alt,
  style,
  className,
  objectFit = 'contain', // Default to contain to avoid cropping as per user request
  loading = 'lazy',
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' }) {
  const [didError, setDidError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    setDidError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`} style={style}>
      {isLoading && !didError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {didError ? (
        <div className="flex items-center justify-center w-full h-full bg-gray-50 min-h-[100px]">
          <img 
            src={ERROR_IMG_SRC} 
            alt="Error loading image" 
            className="w-12 h-12 opacity-20"
          />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          loading={loading}
          decoding="async"
          onError={handleError}
          onLoad={handleLoad}
          {...rest}
        />
      )}
    </div>
  )
}
