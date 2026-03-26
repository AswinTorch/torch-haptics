# torch-haptics

[![npm version](https://img.shields.io/npm/v/torch-haptics)](https://www.npmjs.com/package/torch-haptics)
[![npm downloads](https://img.shields.io/npm/dm/torch-haptics)](https://www.npmjs.com/package/torch-haptics)

Core Haptics for Expo on **iOS** — a TypeScript-friendly API for custom haptic patterns, players, dynamic parameters, and AHAP playback.

## Platform support

**iOS only.** This package ships native code for Apple’s Core Haptics. There is no Android or web implementation.

If your Expo app targets Android or web, **do not** import this module on those platforms unless you guard usage (for example `Platform.OS === "ios"` or a lazy `import()`). Otherwise `requireNativeModule` may throw at load time.

## Install

This library includes **native iOS code**. It does **not** run inside **Expo Go** — use a **development build** ([`npx expo run:ios`](https://docs.expo.dev/develop/tools/#expo-run-commands), Xcode, or [EAS Build](https://docs.expo.dev/build/introduction/)).

Add the package with Expo’s installer so versions match your SDK:

```bash
npx expo install torch-haptics
```

Then create or refresh your native project and run on device or simulator as you usually do for a dev client (for example `npx expo prebuild` if you use [CNG](https://docs.expo.dev/workflow/prebuild/), then `npx expo run:ios`). Installing pods is normally handled as part of that iOS build; you only need to run `npx pod-install` (or `pod install` inside `ios/`) yourself if you are opening the Xcode workspace directly or fixing a stale CocoaPods state.

For **bare React Native** (no Expo app entry), use `npm install torch-haptics`, ensure [`expo` is installed](https://docs.expo.dev/bare/installing-expo-modules/), then `npx pod-install` from the app root is the typical CocoaPods step.

## Usage

Import the high-level API from `HapticsEngine`. Always call `initialize()` once before other calls (except `supportsHaptics()`, which uses the native module directly). The examples below (after **Initialize and lifecycle**) assume initialization has already succeeded.

Full typings: [`src/TorchHaptics.types.ts`](src/TorchHaptics.types.ts) (`HapticPattern`, `AHAPFile`, `HapticDynamicParameterID`, etc.).

### Initialize and lifecycle

```ts
import { HapticsEngine } from "torch-haptics";

const ok = await HapticsEngine.initialize();
if (!ok) {
  // Engine failed to start (unsupported hardware, audio session, etc.)
  return;
}

// Optional: check hardware support
if (!HapticsEngine.supportsHaptics()) {
  return;
}

// When you are done (e.g. screen unmount)
HapticsEngine.stop();
```

### One-shot haptic (transient)

Plays a single impulse — good for taps and light feedback.

```ts
import type { HapticPattern } from "torch-haptics";

const tap: HapticPattern = {
  Pattern: [
    {
      Event: {
        Time: 0,
        EventType: "HapticTransient",
        EventParameters: [
          { ParameterID: "HapticIntensity", ParameterValue: 1 },
          { ParameterID: "HapticSharpness", ParameterValue: 0.5 },
        ],
      },
    },
  ],
};

await HapticsEngine.play(tap);
```

### Continuous haptic

Use `HapticContinuous` with `EventDuration` (seconds) for rumble-style feedback.

```ts
const rumble: HapticPattern = {
  Pattern: [
    {
      Event: {
        Time: 0,
        EventType: "HapticContinuous",
        EventDuration: 0.4,
        EventParameters: [
          { ParameterID: "HapticIntensity", ParameterValue: 0.9 },
          { ParameterID: "HapticSharpness", ParameterValue: 0.35 },
        ],
      },
    },
  ],
};

await HapticsEngine.play(rumble);
```

### Advanced player (start, stop, dynamic parameters)

`createPlayer` returns a `HapticsPlayer` backed by Core Haptics’ **advanced** player. Start playback, then adjust intensity/sharpness (or audio controls for audio-capable patterns) while it runs. Always `destroy()` when finished.

```ts
const pattern: HapticPattern = {
  Pattern: [
    {
      Event: {
        Time: 0,
        EventType: "HapticContinuous",
        EventDuration: 2,
        EventParameters: [
          { ParameterID: "HapticIntensity", ParameterValue: 0.5 },
          { ParameterID: "HapticSharpness", ParameterValue: 0.4 },
        ],
      },
    },
  ],
};

const player = await HapticsEngine.createPlayer(pattern);
await player.start();

// Ramp intensity while playing (0.0 – 1.0)
await player.sendParameter("HapticIntensityControl", 0.9, 0);
await player.sendParameter("HapticSharpnessControl", 0.2, 0.1);

await player.stop();
await player.destroy();
```

Dynamic parameter IDs include `HapticIntensityControl`, `HapticSharpnessControl`, and audio-focused controls such as `AudioVolumeControl` when the pattern uses audio events — see `HapticDynamicParameterID` in the type definitions.

### Play an AHAP pattern once

AHAP is Apple’s JSON format for haptic + audio patterns. Pass an object (serialized for you) or a **JSON string**. The payload must include a top-level `Pattern` array compatible with Core Haptics (same event shape as above).

```ts
const ahapFromFile = `{
  "Version": 1,
  "Pattern": [
    {
      "Event": {
        "Time": 0,
        "EventType": "HapticTransient",
        "EventParameters": [
          { "ParameterID": "HapticIntensity", "ParameterValue": 1 },
          { "ParameterID": "HapticSharpness", "ParameterValue": 0.6 }
        ]
      }
    }
  ]
}`;

await HapticsEngine.playAHAP(ahapFromFile);
```

You can also pass a parsed object that satisfies `AHAPFile` / the same JSON shape.

### AHAP-based advanced player

Create a player from AHAP JSON for **start/stop** control and **dynamic parameters** on that pattern — same `HapticsPlayer` API as `createPlayer`.

```ts
const ahapJson = `{
  "Version": 1,
  "Pattern": [
    {
      "Event": {
        "Time": 0,
        "EventType": "HapticContinuous",
        "EventDuration": 1.5,
        "EventParameters": [
          { "ParameterID": "HapticIntensity", "ParameterValue": 0.7 },
          { "ParameterID": "HapticSharpness", "ParameterValue": 0.5 }
        ]
      }
    }
  ]
}`;

const player = await HapticsEngine.createPlayerFromAHAP(ahapJson);
try {
  await player.start();
  await player.sendParameter("HapticIntensityControl", 1, 0);
  await new Promise((r) => setTimeout(r, 500));
} finally {
  await player.stop();
  await player.destroy();
}
```

For full AHAP authoring, see Apple’s [Core Haptics](https://developer.apple.com/documentation/corehaptics) documentation; export JSON from Apple’s authoring tools when possible so structure matches what `CHHapticEngine` expects.

## Example app

From the package repo:

```bash
cd example
npm install
npx expo prebuild --clean --platform ios
npx expo run:ios
```

Use a physical device for the most representative haptic feedback.

## License

MIT — see [LICENSE](./LICENSE).
