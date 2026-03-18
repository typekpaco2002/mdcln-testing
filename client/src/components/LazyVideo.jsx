import { useState, useRef, useEffect, memo } from "react";
import { Play } from "lucide-react";

const LazyVideo = memo(function LazyVideo({
  src,
  className = "",
  videoClassName = "",
  placeholder = "bg-slate-800",
  rootMargin = "200px",
  ...props
}) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {!isInView ? (
        <div className={`w-full h-full ${placeholder} flex items-center justify-center`}>
          <Play className="w-5 h-5 text-slate-600" />
        </div>
      ) : (
        <video
          src={src}
          preload="metadata"
          className={`w-full h-full ${videoClassName}`}
          {...props}
        />
      )}
    </div>
  );
});

export default LazyVideo;
