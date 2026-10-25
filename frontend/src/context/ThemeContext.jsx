import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS } from 'chart.js';

const STORAGE_KEY = 'cci-theme';
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

// Adds "dark" or "light" to <html>. All dark-mode CSS in index.css is keyed on html.dark
const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  // default colours for every Chart.js chart in the app
  ChartJS.defaults.color = theme === 'dark' ? '#94a3b8' : '#64748b';
  ChartJS.defaults.borderColor = theme === 'dark' ? '#2a3342' : '#e5e9f2';
};

const readSaved = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'; } // dark is the default
  catch { return 'dark'; }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => { const t = readSaved(); applyTheme(t); return t; });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
