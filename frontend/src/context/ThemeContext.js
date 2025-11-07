import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      background: isDarkMode ? '#111827' : '#f9fafb',
      surface: isDarkMode ? '#1f2937' : '#ffffff',
      text: isDarkMode ? '#f9fafb' : '#1f2937',
      textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
      textTertiary: isDarkMode ? '#6b7280' : '#9ca3af',
      border: isDarkMode ? '#374151' : '#e5e7eb',
      primary: '#6366f1',
      primaryLight: isDarkMode ? '#312e81' : '#eef2ff', // Màu tím nhạt hơn cho dark mode
      cardBackground: isDarkMode ? '#1f2937' : '#ffffff',
      emptyIcon: isDarkMode ? '#374151' : '#d1d5db',
      // Màu cho stats icons
      greenLight: isDarkMode ? '#064e3b' : '#d1fae5', // Xanh lá nhạt
      greenIcon: '#10b981', // Xanh lá đậm
      blueLight: isDarkMode ? '#1e3a5f' : '#e0f2fe',
      blueIcon: '#0ea5e9',
      yellowLight: isDarkMode ? '#78350f' : '#fef3c7',
      yellowIcon: '#f59e0b',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

