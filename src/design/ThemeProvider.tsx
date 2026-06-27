import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { palette } from './colors';
import { createTheme, defaultTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  /** Current accent hue. Eventually mirrors the active Person.cor_tema. */
  accent: string;
  /** Re-tint the whole app around a new accent. */
  setAccent: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  accent: palette.amber,
  setAccent: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialAccent?: string;
}

export function ThemeProvider({ children, initialAccent = palette.amber }: ThemeProviderProps) {
  const [accent, setAccentState] = useState(initialAccent);

  const setAccent = useCallback((hex: string) => setAccentState(hex), []);

  const theme = useMemo(() => createTheme(accent), [accent]);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, accent, setAccent }),
    [theme, accent, setAccent],
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
