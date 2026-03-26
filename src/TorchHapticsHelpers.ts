import type {
  AHAPFile,
  HapticDynamicParameterID,
  HapticPattern,
} from "./TorchHaptics.types";
import TorchHapticsModule from "./TorchHapticsModule";

// Track engine state
let enginePrepared = false;

/**
 * Initialize the haptics engine. Must be called before using any other methods.
 * @returns Promise<boolean> - true if engine initialized successfully
 */
export async function initializeHaptics(): Promise<boolean> {
  try {
    enginePrepared = await TorchHapticsModule.prepare();
    return enginePrepared;
  } catch (error) {
    console.error("[torch-haptics] Failed to initialize haptics engine", error);
    return false;
  }
}

/**
 * Stop the haptics engine.
 */
export function stopHaptics(): void {
  TorchHapticsModule.stop();
  enginePrepared = false;
}

/**
 * Check if the device supports haptics.
 * @returns boolean - true if device supports haptics
 */
export function supportsHaptics(): boolean {
  return TorchHapticsModule.supportsHaptics();
}

/**
 * Play a haptic pattern once.
 * @param pattern - The haptic pattern to play
 */
export async function playHaptic(pattern: HapticPattern): Promise<void> {
  if (!enginePrepared) {
    throw new Error(
      "Haptics engine not initialized. Call initializeHaptics() first."
    );
  }

  try {
    await TorchHapticsModule.playPattern(pattern);
  } catch (error) {
    console.error("[torch-haptics] Failed to play haptic pattern", error);
    throw error;
  }
}

/**
 * Create a haptic player for advanced control.
 * @param pattern - The haptic pattern
 * @returns Promise<HapticsPlayer> - Player instance for controlling playback
 */
export async function createHapticPlayer(
  pattern: HapticPattern
): Promise<HapticsPlayer> {
  if (!enginePrepared) {
    throw new Error(
      "Haptics engine not initialized. Call initializeHaptics() first."
    );
  }

  try {
    const playerId = await TorchHapticsModule.createPlayer(pattern);
    return new HapticsPlayer(playerId);
  } catch (error) {
    console.error("[torch-haptics] Failed to create haptic player", error);
    throw error;
  }
}

/**
 * Play a haptic pattern from an AHAP file (Apple Haptic and Audio Pattern).
 * @param ahap - AHAP file object or JSON string
 */
export async function playAHAP(ahap: AHAPFile | string): Promise<void> {
  if (!enginePrepared) {
    throw new Error(
      "Haptics engine not initialized. Call initializeHaptics() first."
    );
  }

  try {
    const ahapJson = typeof ahap === "string" ? ahap : JSON.stringify(ahap);
    await TorchHapticsModule.playPatternFromAHAP(ahapJson);
  } catch (error) {
    console.error("[torch-haptics] Failed to play AHAP pattern", error);
    throw error;
  }
}

/**
 * Create a player from an AHAP file.
 * @param ahap - AHAP file object or JSON string
 * @returns Promise<HapticsPlayer> - Player instance
 */
export async function createPlayerFromAHAP(
  ahap: AHAPFile | string
): Promise<HapticsPlayer> {
  if (!enginePrepared) {
    throw new Error(
      "Haptics engine not initialized. Call initializeHaptics() first."
    );
  }

  try {
    const ahapJson = typeof ahap === "string" ? ahap : JSON.stringify(ahap);
    const playerId = await TorchHapticsModule.createPlayerFromAHAP(ahapJson);
    return new HapticsPlayer(playerId);
  } catch (error) {
    console.error("[torch-haptics] Failed to create player from AHAP", error);
    throw error;
  }
}

/**
 * Namespace object for haptics functions
 */
export const HapticsEngine = {
  initialize: initializeHaptics,
  stop: stopHaptics,
  supportsHaptics,
  play: playHaptic,
  createPlayer: createHapticPlayer,
  playAHAP,
  createPlayerFromAHAP,
} as const;

/**
 * Haptic player class for advanced playback control.
 */
export class HapticsPlayer {
  private readonly playerId: string;
  private isDestroyed = false;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  /**
   * Start the haptic player.
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Player has been destroyed");
    }

    try {
      await TorchHapticsModule.startPlayer(this.playerId);
    } catch (error) {
      console.error("[torch-haptics] Failed to start haptic player", error);
      throw error;
    }
  }

  /**
   * Stop the haptic player.
   */
  async stop(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Player has been destroyed");
    }

    try {
      await TorchHapticsModule.stopPlayer(this.playerId);
    } catch (error) {
      console.error("[torch-haptics] Failed to stop haptic player", error);
      throw error;
    }
  }

  /**
   * Send a dynamic parameter change to the playing pattern.
   * @param parameterId - The parameter to change (e.g., "HapticIntensityControl")
   * @param value - The new value (0.0 - 1.0)
   * @param time - Relative time in seconds from now (default: 0)
   */
  async sendParameter(
    parameterId: HapticDynamicParameterID,
    value: number,
    time = 0
  ): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Player has been destroyed");
    }

    if (value < 0 || value > 1) {
      throw new Error("Parameter value must be between 0.0 and 1.0");
    }

    try {
      await TorchHapticsModule.scheduleParameterCurve(
        this.playerId,
        parameterId,
        value,
        time
      );
    } catch (error) {
      console.error("[torch-haptics] Failed to send parameter", error);
      throw error;
    }
  }

  /**
   * Destroy the player and free resources.
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    try {
      await TorchHapticsModule.destroyPlayer(this.playerId);
      this.isDestroyed = true;
    } catch (error) {
      console.error("[torch-haptics] Failed to destroy haptic player", error);
      throw error;
    }
  }

  /**
   * Check if the player has been destroyed.
   */
  isPlayerDestroyed(): boolean {
    return this.isDestroyed;
  }
}
