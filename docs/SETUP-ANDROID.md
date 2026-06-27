# Rodando o `ev` no seu celular (dev build via USB)

Você escolheu **dev build local** (sem Expo Go). Isso compila um app de
desenvolvimento de verdade e instala no seu Android pelo cabo USB. É preciso
instalar o toolchain Android **uma vez**. Depois disso, rodar é um comando só.

> Tudo isto é setup de máquina — não mexe no código do projeto.

## 1. Instalar o Android Studio (uma vez)

1. Baixe e instale o **Android Studio**: https://developer.android.com/studio
2. No primeiro abrir, deixe o assistente instalar o **Android SDK**.
3. Abra **Settings → Languages & Frameworks → Android SDK** e, na aba
   **SDK Platforms**, marque **Android 15 (API 35)** ou superior.
4. Na aba **SDK Tools**, confirme que estão marcados:
   - **Android SDK Platform-Tools** (traz o `adb`)
   - **Android SDK Build-Tools**
   - **Android Emulator** (opcional — só se quiser testar sem o celular)

O SDK costuma ficar em: `C:\Users\jhonn\AppData\Local\Android\Sdk`

## 2. Variáveis de ambiente (uma vez)

No PowerShell, defina-as de forma permanente (ajuste o caminho se o seu SDK
estiver em outro lugar):

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

> `JAVA_HOME` aponta para o JDK que vem embutido no Android Studio (a pasta
> `jbr`). Se você instalou o Studio em outro caminho, ajuste.

**Feche e reabra o terminal** depois do `setx` (ele só vale em sessões novas).
Confira:

```powershell
adb version
java -version
```

## 3. Preparar o celular (uma vez)

1. **Configurações → Sobre o telefone** → toque 7× em **Número da versão**
   para liberar as **Opções do desenvolvedor**.
2. Em **Opções do desenvolvedor**, ative **Depuração USB**.
3. Conecte o celular no PC por USB e aceite o prompt **"Permitir depuração USB?"**.
4. Confirme que o PC enxerga o aparelho:

```powershell
adb devices
```

Deve listar seu dispositivo como `device` (não `unauthorized`).

## 4. Rodar o app

Na pasta do projeto (`E:\app ev`):

```powershell
npm run android
```

(equivale a `npx expo run:android`)

A **primeira vez** compila o app nativo — pode levar alguns minutos e baixar o
Gradle. Ele instala o dev build no seu celular e abre o servidor Metro.

Nas vezes seguintes, com o dev build já instalado, basta:

```powershell
npm start
```

…e abrir o app no celular (ele conecta no Metro pelo USB/Wi‑Fi). Mudanças de
JS recarregam na hora (Fast Refresh). Só é preciso recompilar (`npm run
android`) quando entrar uma **nova dependência nativa**.

## Problemas comuns

- **`adb` não encontrado** → o `platform-tools` não está no PATH (passo 2) ou o
  terminal não foi reaberto.
- **`JAVA_HOME is not set` / erro de Gradle** → confira o passo 2; o caminho do
  `jbr` precisa existir.
- **`device unauthorized`** → desbloqueie o celular e aceite o prompt de
  depuração USB; rode `adb kill-server; adb devices` de novo.
- **Build falha por licenças do SDK** → rode
  `& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses` e
  aceite tudo.
