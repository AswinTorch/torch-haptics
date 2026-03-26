import { requireNativeView } from 'expo';
import * as React from 'react';

import { TorchHapticsViewProps } from './TorchHaptics.types';

const NativeView: React.ComponentType<TorchHapticsViewProps> =
  requireNativeView('TorchHaptics');

export default function TorchHapticsView(props: TorchHapticsViewProps) {
  return <NativeView {...props} />;
}
