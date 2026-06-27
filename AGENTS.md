# ev — guia do repositório

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before
writing any code. Esta base usa **Expo SDK 56, RN 0.85, React 19 (react-compiler
ON), Reanimated 4 (+ react-native-worklets, New Architecture)**. APIs do
Reanimated 3 podem não valer; confirme contra `node_modules`.

## O que é

App local-first, privado, dedicado a uma pessoa. O peso emocional é o requisito
nº 1: a interface, as animações e a fluidez transmitem cuidado. Premium =
contenção + movimento.

## Regras de ouro

- **Design tokens, sempre.** Cores via `theme.colors` (de `useTheme()`),
  espaçamento via `spacing`, raios via `radius`, fontes via `typography`. Nada
  de hex/magic numbers soltos.
- **Animação só na UI thread** (Reanimated). Física de mola (`springs.*`),
  nunca easing linear cru. Nada de `setState` em loop de animação.
- **Texto sempre pelo `<Text>`** do kit (`@/components`), com `variant`. Serif
  (Newsreader) para títulos/emoção; Inter para UI.
- **Háptica** via `@/lib/haptics` em momentos com significado.
- **TypeScript estrito, sem código morto.** Componentização limpa.
- **Dark-first.** Acento único, derivável por pessoa (`useAccent().setAccent`).
- **Tom:** na dúvida, a versão mais silenciosa, lenta e cuidadosa.

## Onde fica o quê

- `src/design/` — tokens + tema (`useTheme`, `useAccent`). Barrel: `@/design`.
- `src/components/` — UI kit. Barrel: `@/components`.
- `src/animations/` — `usePressScale`, presets de entrada. Barrel: `@/animations`.
- `src/lib/` — háptica, datas, dados de exemplo (Fase 0).
- `src/app/` — rotas (Expo Router). Tabs em `(tabs)/`.

## Comandos

- `npm run android` — dev build no celular via USB (1ª vez compila).
- `npm start` — Metro (Fast Refresh) com dev build já instalado.
- `npm run typecheck` — `tsc --noEmit`.

## Decisões de produto em aberto (perguntar, não inventar)

- Escala/formato do humor (placeholder em `sampleData.moodScale`) — Fase 2.
- Formato das cápsulas/cartas — Fase 3.
