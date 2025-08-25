import { useCallback, useRef, useState, useEffect } from 'react';

export interface Announcement {
  id: string;
  message: string;
  timestamp: number;
}

export function useAccessibility() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const regionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: Date.now(),
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Clean up old announcements after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  // Component for the live region
  const LiveRegion = () => (
    <div
      ref={regionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcements[announcements.length - 1]?.message}
    </div>
  );

  return {
    announce,
    clearAnnouncements,
    LiveRegion,
  };
}

export interface SkipLink {
  href: string;
  label: string;
}

export interface SkipLinksProps {
  links: SkipLink[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <div className="skip-links">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded focus:shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target instanceof HTMLElement) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// Form validation helpers
export function validateForm(form: HTMLFormElement): boolean {
  const formData = new FormData(form);
  const errors: string[] = [];

  // Basic validation - this would be expanded based on actual needs
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && value.trim() === '') {
      const field = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (field && field.required) {
        errors.push(`${key} is required`);
      }
    }
  }

  return errors.length === 0;
}