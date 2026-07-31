import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { palette } from './colors';
import { createTheme, defaultTheme, type Theme, type ThemeMode } from './theme';
import { prefs } from '@/lib/prefs';

function normalizeAccent(hex: string): string {
  const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(hex);
  if (!match) return hex;
  const [, rs, gs, bs] = match;
  const [r, g, b] = [rs, gs, bs].map((value) => Number.parseInt(value, 16));
  // Early builds offered rose/magenta as the person's accent, which also
  // painted the sunflower and made the whole garden look pink. Preserve every
  // warm amber/terracotta preset, but migrate that old rose family to gold.
  const legacyRose =
    (r > g + 25 && b > g + 12) ||
    (r > 190 && g > 100 && b > 115);
  return legacyRose ? palette.sunflower : hex;
}

interface ThemeContextValue {
  theme: Theme;
  /** Current accent hue. Eventually mirrors the active Person.cor_tema. */
  accent: string;
  /** Re-tint the whole app around a new accent. */
  setAccent: (hex: string) => void;
  /** Current climate (night / day). */
  mode: ThemeMode;
  /** Re-light the whole app; persisted so it survives restarts. */
  setMode: (mode: ThemeMode) => void;
  /** Flip between night and day. */
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  accent: palette.sunflower,
  setAccent: () => {},
  mode: 'noite',
  setMode: () => {},
  toggleMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialAccent?: string;
}

export function ThemeProvider({ children, initialAccent = palette.sunflower }: ThemeProviderProps) {
  const [accent, setAccentState] = useState(() => normalizeAccent(initialAccent));
  const [mode, setModeState] = useState<ThemeMode>(() => prefs.getThemeMode());

  const setAccent = useCallback((hex: string) => setAccentState(normalizeAccent(hex)), []);
  const setMode = useCallback((next: ThemeMode) => {
    prefs.setThemeMode(next);
    setModeState(next);
  }, []);
  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'noite' ? 'dia' : 'noite';
      prefs.setThemeMode(next);
      return next;
    });
  }, []);

  const theme = useMemo(() => createTheme(accent, mode), [accent, mode]);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, accent, setAccent, mode, setMode, toggleMode }),
    [theme, accent, setAccent, mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active theme (colors + tokens). The everyday hook. */
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Read and change the accent hue (per-person theming). */
export function useAccent(): { accent: string; setAccent: (hex: string) => void } {
  const { accent, setAccent } = useContext(ThemeContext);
  return { accent, setAccent };
}

/** Read and change the visual climate (night / day). */
export function useMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void; toggleMode: () => void } {
  const { mode, setMode, toggleMode } = useContext(ThemeContext);
  return { mode, setMode, toggleMode };
}
