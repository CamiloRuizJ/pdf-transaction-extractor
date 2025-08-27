import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-neutral-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <img 
              src="/rexeli-logo-footer.svg" 
              alt="RExeli" 
              className="h-8 w-auto"
            />
          </div>
          <p className="text-neutral-400 text-sm">
            AI-Powered Commercial Real Estate Document Processing Platform
          </p>
          <p className="text-neutral-500 text-xs mt-2">
            Built with React, TypeScript, and advanced machine learning
          </p>
        </div>
      </footer>
    </div>
  );
}