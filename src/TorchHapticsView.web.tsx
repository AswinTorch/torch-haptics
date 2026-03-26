import * as React from 'react';

import { TorchHapticsViewProps } from './TorchHaptics.types';

export default function TorchHapticsView(props: TorchHapticsViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
