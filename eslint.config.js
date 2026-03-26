// ESLint 9 flat config extending expo-module-scripts (custom ignores for build output).
const { defineConfig } = require('eslint/config');
const baseConfig = require('expo-module-scripts/eslint.config.base');

module.exports = defineConfig([
  { ignores: ['**/build/**'] },
  baseConfig,
]);
