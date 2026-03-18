import { useState, useRef, useEffect, memo } from "react";

const LazyImage = memo(function LazyImage({ 
  src, 
  alt = "", 
  className = "", 
  imgClassName = "",
  placeholder = "bg-slate-800",
  objectFit = "cover",
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px", threshold: 0.01 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const objectFitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`} {...props}>
      {!isLoaded && (
        <div className={`absolute inset-0 ${placeholder} animate-pulse`} />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${objectFitClass} transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
});

export default LazyImage;
