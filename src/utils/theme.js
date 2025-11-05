// Theme management utilities

const THEME_STORAGE_KEY = 'appTheme';

export const themes = {
  'yellow-green': {
    id: 'yellow-green',
    name: 'Yellow & Green',
    colors: {
      primary: '#ffd700',
      secondary: '#32cd32',
      tertiary: '#28a745',
      primaryRgb: '255, 215, 0',
      secondaryRgb: '50, 205, 50',
      tertiaryRgb: '40, 167, 69',
    },
  },
  'pink-blue': {
    id: 'pink-blue',
    name: 'Pink & Blue',
    colors: {
      primary: '#ff006e',
      secondary: '#8338ec',
      tertiary: '#3a86ff',
      primaryRgb: '255, 0, 110',
      secondaryRgb: '131, 56, 236',
      tertiaryRgb: '58, 134, 255',
    },
  },
  'orange-red': {
    id: 'orange-red',
    name: 'Orange & Red',
    colors: {
      primary: '#ff6b35',
      secondary: '#f7931e',
      tertiary: '#e63946',
      primaryRgb: '255, 107, 53',
      secondaryRgb: '247, 147, 30',
      tertiaryRgb: '230, 57, 70',
    },
  },
  'purple-pink': {
    id: 'purple-pink',
    name: 'Purple & Pink',
    colors: {
      primary: '#8338ec',
      secondary: '#ff006e',
      tertiary: '#c77dff',
      primaryRgb: '131, 56, 236',
      secondaryRgb: '255, 0, 110',
      tertiaryRgb: '199, 125, 255',
    },
  },
};

export const getTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme && themes[savedTheme] ? savedTheme : 'yellow-green';
};

export const saveTheme = (themeId) => {
  if (themes[themeId]) {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    applyTheme(themeId);
  }
};

export const applyTheme = (themeId) => {
  const theme = themes[themeId];
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-tertiary', theme.colors.tertiary);
  root.style.setProperty('--theme-primary-rgb', theme.colors.primaryRgb);
  root.style.setProperty('--theme-secondary-rgb', theme.colors.secondaryRgb);
  root.style.setProperty('--theme-tertiary-rgb', theme.colors.tertiaryRgb);
};

