// Core Haptics Type Definitions

export type HapticEventType =
  | "HapticTransient"
  | "HapticContinuous"
  | "AudioContinuous"
  | "AudioCustom";

export type HapticParameterID =
  | "HapticIntensity"
  | "HapticSharpness"
  | "AttackTime"
  | "DecayTime"
  | "ReleaseTime"
  | "Sustained";

export type HapticDynamicParameterID =
  | "HapticIntensityControl"
  | "HapticSharpnessControl"
  | "AudioVolumeControl"
  | "AudioPitchControl"
  | "AudioPanControl"
  | "AudioBrightnessControl";

export type HapticEventParameter = {
  ParameterID: HapticParameterID;
  ParameterValue: number;
};

export type HapticDynamicParameter = {
  ParameterID: HapticDynamicParameterID;
  ParameterValue: number;
  Time: number;
};

export type HapticEvent = {
  Event: {
    Time: number;
    EventType: HapticEventType;
    EventDuration?: number;
    EventParameters?: HapticEventParameter[];
  };
};

export type HapticPatternParameter = {
  Parameter: {
    ParameterID: HapticParameterID;
    ParameterValue: number;
  };
};

export type HapticPattern = {
  Pattern: (HapticEvent | HapticPatternParameter)[];
  PatternParameters?: {
    ParameterID: string;
    ParameterValue: number;
  }[];
};

// AHAP File Format (Apple Haptic and Audio Pattern)
export type AHAPFile = {
  Version: number;
  Metadata?: {
    Project?: string;
    Created?: string;
    Description?: string;
  };
  Pattern: {
    Event?: {
      Time: number;
      EventType: HapticEventType;
      EventDuration?: number;
      EventParameters?: {
        ParameterID: string;
        ParameterValue: number;
      }[];
    };
    Parameter?: {
      ParameterID: string;
      ParameterValue: number;
      Time?: number;
    };
    ParameterCurve?: {
      ParameterID: string;
      Time: number;
      ParameterCurveControlPoints: {
        Time: number;
        ParameterValue: number;
      }[];
    };
  }[];
};

export type TorchHapticsModuleEvents = Record<string, never>;
