import { registerWebModule, NativeModule } from 'expo';

import { TorchHapticsModuleEvents } from './TorchHaptics.types';

class TorchHapticsModule extends NativeModule<TorchHapticsModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(TorchHapticsModule, 'TorchHapticsModule');
