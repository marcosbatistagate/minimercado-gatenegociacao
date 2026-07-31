import React, { useEffect, useRef } from 'react';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: '100' | '200' | '300' | '500';
  animation?: 'fade-up' | 'blur-in';
}

export function FadeIn({ children, className = '', delay, animation = 'fade-up' }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const delayClass = delay ? `delay-${delay}` : '';
  const animClass = animation === 'blur-in' ? 'scroll-blur-in' : 'scroll-fade-up';

  return (
    <div
      ref={ref}
      className={`scroll-item ${animClass} ${delayClass} ${className}`}
    >
      {children}
    </div>
  );
}
