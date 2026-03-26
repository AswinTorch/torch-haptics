import { NativeModule, requireNativeModule } from 'expo';

import { TorchHapticsModuleEvents } from './TorchHaptics.types';

declare class TorchHapticsModule extends NativeModule<TorchHapticsModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<TorchHapticsModule>('TorchHaptics');
