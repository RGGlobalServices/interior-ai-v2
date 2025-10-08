import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Assumes App.js exists and is the main component

// Get the root element from the public/index.html file
const container = document.getElementById('root');
const root = createRoot(container);

// Render the application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);