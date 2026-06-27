const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Two Android build tweaks applied on every prebuild:
 *
 * 1. Pin the Gradle wrapper to 8.13. Expo SDK 56 prebuild generates Gradle 9.3.1,
 *    too new for the AGP 8.12 RN 0.85 uses (Gradle 9 removed JvmVendorSpec.IBM_SEMERU
 *    that the toolchain plugin still references).
 *
 * 2. Build only arm64-v8a (every modern phone). The default builds 4 ABIs, which
 *    makes the native compile ~4x slower for no benefit on a single device.
 */
const GRADLE_VERSION = '8.13';
const ARCHITECTURES = 'arm64-v8a';

function withGradleWrapperPin(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const file = path.join(
        cfg.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties',
      );
      if (fs.existsSync(file)) {
        let contents = fs.readFileSync(file, 'utf8');
        contents = contents.replace(
          /distributionUrl=.*/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`,
        );
        fs.writeFileSync(file, contents);
      }
      return cfg;
    },
  ]);
}

function withSingleArchitecture(config) {
  return withGradleProperties(config, (cfg) => {
    const key = 'reactNativeArchitectures';
    const existing = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
    if (existing) {
      existing.value = ARCHITECTURES;
    } else {
      cfg.modResults.push({ type: 'property', key, value: ARCHITECTURES });
    }
    return cfg;
  });
}

module.exports = function withAndroidBuildTweaks(config) {
  return withSingleArchitecture(withGradleWrapperPin(config));
};
