import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Cog6ToothIcon, HeartIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useSystemStatus } from '../../contexts';
import { cn } from '../../utils/cn';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { aiServiceStatus } = useSystemStatus();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/rexeli-logo-header.svg" 
                alt="RExeli" 
                className="h-10 w-auto mr-3"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-primary-600 font-medium">
                    AI-Powered
                  </span>
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    aiServiceStatus.status === 'connected' && 'bg-success-500',
                    aiServiceStatus.status === 'disconnected' && 'bg-neutral-400',
                    aiServiceStatus.status === 'error' && 'bg-error-500'
                  )} title={`AI Service: ${aiServiceStatus.status}`} />
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/dashboard"
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md',
                isActive('/dashboard')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-primary-600 hover:bg-primary-50'
              )}
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
            <Link
              to="/tool"
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md',
                isActive('/tool')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-primary-600 hover:bg-primary-50'
              )}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Processing Tool
            </Link>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => navigate('/tool')}
            >
              Get Started
            </Button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-neutral-200">
            <Link
              to="/dashboard"
              className={cn(
                'flex items-center px-3 py-2 text-base font-medium rounded-md',
                isActive('/dashboard')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-primary-600 hover:bg-neutral-50'
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              <ChartBarIcon className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link
              to="/tool"
              className={cn(
                'flex items-center px-3 py-2 text-base font-medium rounded-md',
                isActive('/tool')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-primary-600 hover:bg-neutral-50'
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              <Cog6ToothIcon className="h-5 w-5 mr-3" />
              Processing Tool
            </Link>
            <div className="px-3 py-2">
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  navigate('/tool');
                  setIsMenuOpen(false);
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}