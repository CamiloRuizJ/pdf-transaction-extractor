import React from 'react';
import { AppRouter } from './router/AppRouter';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationContainer } from './components/ui/NotificationContainer';
import './App.css';

function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-neutral-50">
          <AppRouter />
          <NotificationContainer />
        </div>
      </NotificationProvider>
    </AppProvider>
  );
}



export default App;