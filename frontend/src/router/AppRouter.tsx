import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('../components/pages/HomePage'));
const ProcessingTool = React.lazy(() => import('../components/pages/ProcessingTool'));
const Dashboard = React.lazy(() => import('../components/features/Dashboard'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
);

// Route configuration
const routes = [
  {
    path: '/',
    element: <HomePage />,
    title: 'Home - RExeli',
  },
  {
    path: '/tool',
    element: <ProcessingTool />,
    title: 'Processing Tool - RExeli',
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
    title: 'Dashboard - RExeli',
  },
];

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <div>
                      <title>{route.title}</title>
                      {route.element}
                    </div>
                  }
                />
              ))}
              
              {/* Redirect any unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}