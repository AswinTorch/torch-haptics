package expo.modules.torchhaptics

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

/**
 * Android implementation using [Vibrator] / [VibrationEffect].
 * See README for capability differences vs iOS Core Haptics.
 */
class TorchHapticsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val vibrator: Vibrator
    get() =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }

  private val players = mutableMapOf<String, Map<String, Any?>>()
  private var activePlayerId: String? = null

  private val hapticAudioAttributes: AudioAttributes
    get() =
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

  override fun definition() =
    ModuleDefinition {
      Name("TorchHaptics")

      AsyncFunction("prepare") {
        if (!vibrator.hasVibrator()) {
          return@AsyncFunction false
        }
        true
      }

      Function("stop") {
        vibrator.cancel()
        activePlayerId = null
      }

      Function("supportsHaptics") {
        vibrator.hasVibrator()
      }

      AsyncFunction("playPattern") { pattern: Map<String, Any?> ->
        vibrator.cancel()
        activePlayerId = null
        playPatternInternal(pattern)
      }

      AsyncFunction("createPlayer") { pattern: Map<String, Any?> ->
        val id = UUID.randomUUID().toString()
        players[id] = HashMap(pattern)
        id
      }

      AsyncFunction("startPlayer") { playerId: String ->
        val pattern = players[playerId] ?: throw Exceptions.IllegalStateException("Haptic player not found.")
        vibrator.cancel()
        activePlayerId = playerId
        playPatternInternal(pattern)
      }

      AsyncFunction("stopPlayer") { playerId: String ->
        if (activePlayerId == playerId) {
          vibrator.cancel()
          activePlayerId = null
        }
      }

      AsyncFunction("scheduleParameterCurve") { playerId: String, parameterId: String, value: Double, time: Double ->
        throw Exceptions.IllegalStateException(
          "scheduleParameterCurve is not supported on Android (playerId=$playerId, parameterId=$parameterId, value=$value, time=$time). Use iOS Core Haptics for dynamic parameters.",
        )
      }

      AsyncFunction("destroyPlayer") { playerId: String ->
        if (activePlayerId == playerId) {
          vibrator.cancel()
          activePlayerId = null
        }
        players.remove(playerId)
      }

      AsyncFunction("playPatternFromAHAP") { _: String ->
        throw Exceptions.IllegalStateException(
          "AHAP playback is not supported on Android. Use HapticsEngine.play with a HapticPattern, or guard this call to iOS.",
        )
      }

      AsyncFunction("createPlayerFromAHAP") { _: String ->
        throw Exceptions.IllegalStateException(
          "AHAP players are not supported on Android. Use HapticsEngine.createPlayer with a HapticPattern, or guard this call to iOS.",
        )
      }
    }

  private fun playPatternInternal(pattern: Map<String, Any?>) {
    if (!vibrator.hasVibrator()) {
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      vibrator.vibrate(50)
      return
    }
    val effect = buildVibrationEffect(pattern) ?: return
    vibrator.vibrate(effect, hapticAudioAttributes)
  }

  private fun buildVibrationEffect(pattern: Map<String, Any?>): VibrationEffect? {
    val patternList = pattern["Pattern"] as? List<*> ?: return null
    if (patternList.isEmpty()) {
      return null
    }
    val first = patternList[0] as? Map<*, *> ?: return null
    @Suppress("UNCHECKED_CAST")
    val eventDict = first["Event"] as? Map<String, Any?> ?: return null
    val type = eventDict["EventType"] as? String ?: return null
    return effectForEvent(eventDict, type)
  }

  private fun effectForEvent(eventDict: Map<String, Any?>, type: String): VibrationEffect? {
    val intensity = extractIntensity(eventDict)
    return when (type) {
      "HapticTransient" -> transientEffect(intensity)
      "HapticContinuous" -> continuousEffect(eventDict, intensity)
      else -> fallbackEffect()
    }
  }

  private fun transientEffect(intensity: Int): VibrationEffect? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
    }
    val ms = 45L
    return if (vibrator.hasAmplitudeControl()) {
      VibrationEffect.createOneShot(ms, intensity.coerceIn(1, 255))
    } else {
      VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE)
    }
  }

  private fun continuousEffect(eventDict: Map<String, Any?>, intensity: Int): VibrationEffect? {
    val durationSec = (eventDict["EventDuration"] as? Number)?.toDouble() ?: 0.25
    val durationMs = (durationSec * 1000).toLong().coerceIn(1, 5000)
    return if (vibrator.hasAmplitudeControl()) {
      VibrationEffect.createWaveform(
        longArrayOf(0L, durationMs),
        intArrayOf(0, intensity.coerceIn(1, 255)),
        -1,
      )
    } else {
      VibrationEffect.createWaveform(longArrayOf(0L, durationMs), -1)
    }
  }

  private fun fallbackEffect(): VibrationEffect? {
    return VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE)
  }

  private fun extractIntensity(eventDict: Map<String, Any?>): Int {
    val params = eventDict["EventParameters"] as? List<*> ?: return 200
    for (raw in params) {
      val p = raw as? Map<*, *> ?: continue
      if (p["ParameterID"] == "HapticIntensity") {
        val v = (p["ParameterValue"] as? Number)?.toDouble() ?: 0.5
        return (v * 255).toInt().coerceIn(1, 255)
      }
    }
    return 200
  }
}
