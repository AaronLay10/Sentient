import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type ThemeName = 'default' | 'midnight' | 'crimson' | 'arctic' | 'forest' | 'neon';

export interface ThemeOption {
  id: ThemeName;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'default',
    name: 'Sentient Eye',
    description: 'The original cyan and orange theme',
    primaryColor: '#00d9ff',
    secondaryColor: '#ffaa32',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple with emerald accents',
    primaryColor: '#a855f7',
    secondaryColor: '#34d399',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    description: 'Bold red and gold palette',
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blue and ice white',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green and amber tones',
    primaryColor: '#22c55e',
    secondaryColor: '#d97706',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant pink and yellow',
    primaryColor: '#ec4899',
    secondaryColor: '#facc15',
  },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeOption[];
  currentTheme: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'sentient-ui-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as ThemeName) || 'default';
  });

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
