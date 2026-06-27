# ev

Um lugar dedicado a uma pessoa — para guardar quem ela é, registrar o que se
sente, e revisitar isso no dia a dia. Local-first, privado, sem telemetria.
Premium = contenção + movimento.

> Não é um app de fotos. Cada decisão técnica é uma decisão sobre como se
> lembra de alguém.

## Stack

- **Expo SDK 56** + **React Native 0.85** + **TypeScript estrito**
- **Expo Router** (navegação file-based, typed routes)
- **Reanimated 4** + **Gesture Handler** — animações na UI thread (60/120fps)
- **expo-image**, **expo-blur**, **expo-haptics**, **expo-linear-gradient**
- **Newsreader** (serif, títulos emocionais) + **Inter** (sans, UI)
- **Zustand** para estado (a usar a partir da Fase 1)

## Rodar (dev build via USB)

Pré-requisito: toolchain Android instalado — veja
[docs/SETUP-ANDROID.md](docs/SETUP-ANDROID.md).

```powershell
npm run android   # primeira vez: compila e instala o dev build no celular
npm start         # depois: só o servidor Metro (Fast Refresh)
npm run typecheck # tsc --noEmit (estrito)
```

## Estrutura

```
src/
  app/                      # rotas (Expo Router)
    _layout.tsx             # providers (gesture, safe-area, tema, lightbox) + Stack
    (tabs)/                 # navegação principal
      _layout.tsx           # tab bar de vidro custom
      index.tsx             # Hoje (hub diário)
      cofre.tsx             # Cofre de mídia (galeria)
      linha-do-tempo.tsx    # Linha do tempo
      humor.tsx             # Humor / diário emocional
      perfil.tsx            # Perfil da pessoa (capa com parallax)
    memoria/[id].tsx        # Detalhe de memória
    carta/[id].tsx          # Carta / cápsula (abertura ritual)
  design/                   # tokens: cores, tipografia, espaçamento, motion, tema
  components/               # UI kit (Text, Button, Card, GlassSurface, TabBar, Lightbox…)
  animations/               # hooks e presets (springs, press-scale, stagger)
  lib/                      # helpers (háptica, datas, dados de exemplo)
```

## Princípios

1. **Local-first e privado** — nada sai do aparelho por padrão.
2. **Premium = contenção + movimento** — pouca coisa na tela, física de mola
   (nunca easing linear).
3. **Uso diário com propósito** — a tela Hoje dá motivo pra voltar.

Quando uma decisão de design for ambígua, escolha a versão mais silenciosa,
mais lenta e mais cuidadosa.

## Status

**Fase 0 (Fundação)** concluída: design system, navegação e provas de animação.
Dados ainda são de exemplo (`src/lib/sampleData.ts`); persistência local entra
na Fase 1. Roteiro completo no documento de planejamento do projeto.
