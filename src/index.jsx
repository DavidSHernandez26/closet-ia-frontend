import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="theme" enableSystem={false}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
