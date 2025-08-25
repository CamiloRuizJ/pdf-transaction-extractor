import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize the app
const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found. Make sure you have a <div id="root"></div> in your HTML.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
