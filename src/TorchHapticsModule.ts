import { NativeModule, requireNativeModule } from "expo";

import type {
  HapticPattern,
  TorchHapticsModuleEvents,
} from "./TorchHaptics.types";

declare class TorchHapticsModule extends NativeModule<TorchHapticsModuleEvents> {
  /**
   * Initialize the haptic engine. Must be called before using any other methods.
   * @returns Promise<boolean> - true if engine initialized successfully
   */
  prepare(): Promise<boolean>;

  /**
   * Stop the haptic engine.
   */
  stop(): void;

  /**
   * Check if the device supports haptics.
   * @returns boolean - true if device supports haptics
   */
  supportsHaptics(): boolean;

  /**
   * Play a haptic pattern once.
   * @param pattern - The haptic pattern to play
   */
  playPattern(pattern: HapticPattern): Promise<void>;

  /**
   * Create a haptic player for advanced control.
   * @param pattern - The haptic pattern
   * @returns Promise<string> - Player ID for controlling playback
   */
  createPlayer(pattern: HapticPattern): Promise<string>;

  /**
   * Start a haptic player.
   * @param playerId - The player ID returned from createPlayer
   */
  startPlayer(playerId: string): Promise<void>;

  /**
   * Stop a haptic player.
   * @param playerId - The player ID
   */
  stopPlayer(playerId: string): Promise<void>;

  /**
   * Schedule a dynamic parameter change on a playing pattern.
   * @param playerId - The player ID
   * @param parameterId - The parameter to change
   * @param value - The new value (0.0 - 1.0)
   * @param time - Relative time in seconds from now
   */
  scheduleParameterCurve(
    playerId: string,
    parameterId: string,
    value: number,
    time: number,
  ): Promise<void>;

  /**
   * Destroy a haptic player and free resources.
   * @param playerId - The player ID
   */
  destroyPlayer(playerId: string): Promise<void>;

  /**
   * Play a haptic pattern from an AHAP file (Apple Haptic and Audio Pattern).
   * @param ahapJson - JSON string of AHAP file content
   */
  playPatternFromAHAP(ahapJson: string): Promise<void>;

  /**
   * Create a player from an AHAP file.
   * @param ahapJson - JSON string of AHAP file content
   * @returns Promise<string> - Player ID
   */
  createPlayerFromAHAP(ahapJson: string): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<TorchHapticsModule>("TorchHaptics");
