import AVFoundation
import CoreHaptics
import ExpoModulesCore

public class TorchHapticsModule: Module {
  private var engine: CHHapticEngine?
  private var players: [String: CHHapticPatternPlayer] = [:]

  public func definition() -> ModuleDefinition {
    Name("TorchHaptics")

    // Initialize the haptic engine
    AsyncFunction("prepare") { () -> Bool in
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
        return false
      }

      do {
        // Configure audio session to not interrupt audio playback
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try audioSession.setActive(true)

        // Create the haptic engine
        self.engine = try CHHapticEngine()

        // Don't interrupt audio
        self.engine?.playsHapticsOnly = false

        // Handle engine stopped
        self.engine?.stoppedHandler = { reason in
          print("Haptic engine stopped: \(reason)")
        }

        // Handle engine reset
        self.engine?.resetHandler = { [weak self] in
          print("Haptic engine reset")
          do {
            try self?.engine?.start()
          } catch {
            print("Failed to restart haptic engine: \(error)")
          }
        }

        // Start the engine
        try self.engine?.start()

        return true
      } catch {
        print("Failed to initialize haptic engine: \(error)")
        return false
      }
    }

    // Stop the haptic engine
    Function("stop") {
      self.engine?.stop()
    }

    // Check if device supports haptics
    Function("supportsHaptics") { () -> Bool in
      return CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    // Play a pattern once
    AsyncFunction("playPattern") { (patternDict: [String: Any]) in
      guard let engine = self.engine else {
        throw HapticsError.engineNotInitialized
      }

      let pattern = try self.convertToHapticPattern(patternDict)
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
    }

    // Create a player for advanced control
    AsyncFunction("createPlayer") { (patternDict: [String: Any]) -> String in
      guard let engine = self.engine else {
        throw HapticsError.engineNotInitialized
      }

      let pattern = try self.convertToHapticPattern(patternDict)
      let player = try engine.makeAdvancedPlayer(with: pattern)

      let playerId = UUID().uuidString
      self.players[playerId] = player

      return playerId
    }

    // Start a player
    AsyncFunction("startPlayer") { (playerId: String) in
      guard let player = self.players[playerId] else {
        throw HapticsError.playerNotFound
      }

      try player.start(atTime: CHHapticTimeImmediate)
    }

    // Stop a player
    AsyncFunction("stopPlayer") { (playerId: String) in
      guard let player = self.players[playerId] else {
        throw HapticsError.playerNotFound
      }

      try player.stop(atTime: CHHapticTimeImmediate)
    }

    // Schedule parameter curve (dynamic parameter control)
    AsyncFunction("scheduleParameterCurve") {
      (playerId: String, parameterId: String, value: Double, time: Double) in
      guard let player = self.players[playerId] as? CHHapticAdvancedPatternPlayer else {
        throw HapticsError.playerNotFound
      }

      guard let paramId = self.mapDynamicParameter(parameterId) else {
        throw HapticsError.invalidParameter
      }

      let parameter = CHHapticDynamicParameter(
        parameterID: paramId,
        value: Float(value),
        relativeTime: time
      )

      try player.sendParameters([parameter], atTime: CHHapticTimeImmediate)
    }

    // Destroy a player
    AsyncFunction("destroyPlayer") { (playerId: String) in
      self.players.removeValue(forKey: playerId)
    }

    // Play pattern from AHAP file
    AsyncFunction("playPatternFromAHAP") { (ahapJson: String) in
      guard let engine = self.engine else {
        throw HapticsError.engineNotInitialized
      }

      guard let data = ahapJson.data(using: .utf8),
        let ahapDict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        throw HapticsError.invalidAHAP
      }

      // Convert AHAP format to our internal pattern format
      let pattern = try self.convertToHapticPattern(ahapDict)
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
    }

    // Create player from AHAP file
    AsyncFunction("createPlayerFromAHAP") { (ahapJson: String) -> String in
      guard let engine = self.engine else {
        throw HapticsError.engineNotInitialized
      }

      guard let data = ahapJson.data(using: .utf8),
        let ahapDict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        throw HapticsError.invalidAHAP
      }

      // Convert AHAP format to our internal pattern format
      let pattern = try self.convertToHapticPattern(ahapDict)
      let player = try engine.makeAdvancedPlayer(with: pattern)

      let playerId = UUID().uuidString
      self.players[playerId] = player

      return playerId
    }
  }

  // MARK: - Helper Methods

  private func convertToHapticPattern(_ dict: [String: Any]) throws -> CHHapticPattern {
    guard let patternArray = dict["Pattern"] as? [[String: Any]] else {
      throw HapticsError.invalidPattern
    }

    var events: [CHHapticEvent] = []

    for item in patternArray {
      if let eventDict = item["Event"] as? [String: Any] {
        let event = try self.convertToHapticEvent(eventDict)
        events.append(event)
      }
    }

    return try CHHapticPattern(events: events, parameters: [])
  }

  private func convertToHapticEvent(_ dict: [String: Any]) throws -> CHHapticEvent {
    guard let time = dict["Time"] as? Double,
      let eventTypeString = dict["EventType"] as? String
    else {
      throw HapticsError.invalidEvent
    }

    guard let eventType = self.mapEventType(eventTypeString) else {
      throw HapticsError.invalidEventType
    }

    let duration = dict["EventDuration"] as? Double ?? 0.0

    var eventParams: [CHHapticEventParameter] = []
    if let paramArray = dict["EventParameters"] as? [[String: Any]] {
      for paramDict in paramArray {
        if let param = try? self.convertToEventParameter(paramDict) {
          eventParams.append(param)
        }
      }
    }

    return CHHapticEvent(
      eventType: eventType,
      parameters: eventParams,
      relativeTime: time,
      duration: duration
    )
  }

  private func convertToEventParameter(_ dict: [String: Any]) throws -> CHHapticEventParameter {
    guard let paramId = dict["ParameterID"] as? String,
      let value = dict["ParameterValue"] as? Double
    else {
      throw HapticsError.invalidParameter
    }

    guard let mappedParamId = self.mapEventParameter(paramId) else {
      throw HapticsError.invalidParameter
    }

    return CHHapticEventParameter(
      parameterID: mappedParamId,
      value: Float(value)
    )
  }

  // Map event type strings to CHHapticEvent.EventType
  private func mapEventType(_ type: String) -> CHHapticEvent.EventType? {
    switch type {
    case "HapticTransient":
      return .hapticTransient
    case "HapticContinuous":
      return .hapticContinuous
    case "AudioContinuous":
      return .audioContinuous
    case "AudioCustom":
      return .audioCustom
    default:
      return nil
    }
  }

  // Map event parameter strings to CHHapticEvent.ParameterID
  private func mapEventParameter(_ param: String) -> CHHapticEvent.ParameterID? {
    switch param {
    case "HapticIntensity":
      return .hapticIntensity
    case "HapticSharpness":
      return .hapticSharpness
    case "AttackTime":
      return .attackTime
    case "DecayTime":
      return .decayTime
    case "ReleaseTime":
      return .releaseTime
    case "Sustained":
      return .sustained
    default:
      return nil
    }
  }

  // Map dynamic parameter strings to CHHapticDynamicParameter.ID
  private func mapDynamicParameter(_ param: String) -> CHHapticDynamicParameter.ID? {
    switch param {
    case "HapticIntensityControl":
      return .hapticIntensityControl
    case "HapticSharpnessControl":
      return .hapticSharpnessControl
    case "AudioVolumeControl":
      return .audioVolumeControl
    case "AudioPitchControl":
      return .audioPitchControl
    case "AudioPanControl":
      return .audioPanControl
    case "AudioBrightnessControl":
      return .audioBrightnessControl
    default:
      return nil
    }
  }
}

// MARK: - Error Types

enum HapticsError: Error {
  case engineNotInitialized
  case playerNotFound
  case invalidPattern
  case invalidEvent
  case invalidEventType
  case invalidParameter
  case invalidAHAP
}

extension HapticsError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .engineNotInitialized:
      return "Haptic engine not initialized. Call prepare() first."
    case .playerNotFound:
      return "Haptic player not found."
    case .invalidPattern:
      return "Invalid haptic pattern."
    case .invalidEvent:
      return "Invalid haptic event."
    case .invalidEventType:
      return "Invalid event type."
    case .invalidParameter:
      return "Invalid parameter."
    case .invalidAHAP:
      return "Invalid AHAP file format."
    }
  }
}
