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
      background: isDarkMode ? '#141b23' : '#f9fafb',
      surface: isDarkMode ? '#1f2a35' : '#ffffff',
      text: isDarkMode ? '#f3f4f6' : '#1f2937',
      textSecondary: isDarkMode ? '#b4c0cc' : '#6b7280',
      textTertiary: isDarkMode ? '#7f8c98' : '#9ca3af',
      border: isDarkMode ? '#2b3a46' : '#e5e7eb',
      primary: '#435663',
      primaryLight: isDarkMode ? '#2b3a46' : '#e9eef1', // Màu tím nhạt hơn cho dark mode
      cardBackground: isDarkMode ? '#1f2937' : '#ffffff',
      emptyIcon: isDarkMode ? '#374151' : '#d1d5db',
      // Màu cho stats icons
      greenLight: isDarkMode ? '#0b3b33' : '#d1fae5', // Xanh lá nhạt
      greenIcon: '#10b981', // Xanh lá đậm
      blueLight: isDarkMode ? '#193347' : '#e0f2fe',
      blueIcon: '#0ea5e9',
      yellowLight: isDarkMode ? '#4a3112' : '#fef3c7',
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

