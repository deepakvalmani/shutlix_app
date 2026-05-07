import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: Theme;
  setTheme: (theme: Theme) => void;
}

const useThemeStore = create<ThemeState>((set) => ({
  preference: (localStorage.getItem('shutlix-theme') as Theme) || 'system',
  setTheme: (theme) => {
    localStorage.setItem('shutlix-theme', theme);
    set({ preference: theme });
    applyTheme(theme);
  },
}));

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initial apply
if (typeof window !== 'undefined') {
    applyTheme((localStorage.getItem('shutlix-theme') as Theme) || 'system');
}

export default useThemeStore;
