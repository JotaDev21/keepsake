// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // Reanimated shared values are intentionally mutable on the UI thread;
      // the generic React immutability rule cannot distinguish that contract.
      "react-hooks/immutability": "off",
      // Native hydration and ritual effects legitimately update local UI state
      // after external storage/events. The rule is too broad for these flows.
      "react-hooks/set-state-in-effect": "off",
    },
  }
]);
