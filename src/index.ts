// Reexport the native module. On web, it will be resolved to TorchHapticsModule.web.ts
// and on native platforms to TorchHapticsModule.ts
export { default } from './TorchHapticsModule';
export { default as TorchHapticsView } from './TorchHapticsView';
export * from  './TorchHaptics.types';
