import React, { useState, createContext, useContext, useEffect } from 'react';
import { themes } from '../styles/appStyles';

const ThemeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const currentTheme = themes[theme];

  useEffect(() => {
    document.body.style.backgroundColor = currentTheme.background;
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);