# torch-haptics

[![npm version](https://img.shields.io/npm/v/torch-haptics)](https://www.npmjs.com/package/torch-haptics)
[![npm downloads](https://img.shields.io/npm/dm/torch-haptics)](https://www.npmjs.com/package/torch-haptics)

TypeScript-friendly haptics for Expo: **Core Haptics** on **iOS** (patterns, advanced players, AHAP) and **`Vibrator` / `VibrationEffect`** on **Android** (subset; see matrix below). **Web is not supported.**

## Platform support

| Capability | iOS | Android |
|------------|-----|---------|
| `HapticsEngine.initialize` / `stop` / `supportsHaptics` | Yes | Yes |
| `HapticsEngine.play` with `HapticTransient` / `HapticContinuous` | Core Haptics | `VibrationEffect` (predefined click on API 29+ for transient; waveform for continuous). **First event in `Pattern` only** on Android. |
| `createPlayer` / `startPlayer` / `stopPlayer` / `destroy` | Advanced Core Haptics player | Same JS API; vibration session on default vibrator (no mid-play curves). |
| `sendParameter` / `scheduleParameterCurve` | Yes | **Not supported** (throws; use iOS for dynamic parameters). |
| `playAHAP` / `createPlayerFromAHAP` | Yes | **Not supported** (throws; AHAP is Apple-only). |

**Expo Go:** not supported (custom native code). Use a **development build** ([`expo run:ios`](https://docs.expo.dev/develop/tools/#expo-run-commands) / [`expo run:android`](https://docs.expo.dev/develop/tools/#expo-run-commands), or [EAS Build](https://docs.expo.dev/build/introduction/)).

**Web:** do not import in web bundles unless you use a lazy `import()` or platform guard, or `requireNativeModule` will fail.

Android behavior follows [Android haptics guidance](https://developer.android.com/develop/ui/views/haptics/haptics-apis): predefined effects where possible, `AudioAttributes` for sonification usage, amplitude waveforms when `hasAmplitudeControl()` is true.

## Install

```bash
npx expo install torch-haptics
```

Then use **prebuild** if you use [CNG](https://docs.expo.dev/workflow/prebuild/), and run a dev client:

- **iOS:** `npx expo run:ios` (pods usually run as part of the build).
- **Android:** `npx expo run:android`.

For **bare React Native**, use `npm install torch-haptics`, ensure [`expo` is installed](https://docs.expo.dev/bare/installing-expo-modules/), then run `npx pod-install` (iOS) and a normal Gradle sync (Android).

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

**iOS:** `createPlayer` returns a `HapticsPlayer` backed by Core Haptics’ **advanced** player. Start playback, then adjust intensity/sharpness (or audio controls for audio-capable patterns) while it runs.

**Android:** the same API plays the pattern via `VibrationEffect`; **`sendParameter` is not supported** and will throw. Always `destroy()` when finished on both platforms.

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

**iOS only.** AHAP is Apple’s JSON format for haptic + audio patterns. Pass an object (serialized for you) or a **JSON string**. The payload must include a top-level `Pattern` array compatible with Core Haptics (same event shape as above).

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

**iOS only.** Create a player from AHAP JSON for **start/stop** control and **dynamic parameters** on that pattern — same `HapticsPlayer` API as `createPlayer`.

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
npx expo prebuild --clean --platform ios   # and/or --platform android
npx expo run:ios                             # or: npx expo run:android
```

Use a **physical device** for the most representative feedback (especially on iOS Core Haptics).

## License

MIT — see [LICENSE](./LICENSE).
