import { HapticsEngine, type HapticPattern } from "torch-haptics";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

const samplePattern: HapticPattern = {
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

function useNativeHapticsSupported() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const nativeOk = useNativeHapticsSupported();

  useEffect(() => {
    if (!nativeOk) {
      setStatus(
        "This example needs a dev build on iOS or Android. Web is not supported."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const ok = await HapticsEngine.initialize();
      if (cancelled) return;
      setReady(ok);
      setLoading(false);
      setStatus(
        ok
          ? HapticsEngine.supportsHaptics()
            ? "Ready. Tap a button to play haptics."
            : "Device reports no vibration / haptics support."
          : "Failed to prepare haptics."
      );
    })();

    return () => {
      cancelled = true;
      HapticsEngine.stop();
    };
  }, [nativeOk]);

  const onPlayTransient = useCallback(async () => {
    if (!ready) return;
    try {
      await HapticsEngine.play(samplePattern);
      setStatus("Played transient pattern.");
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [ready]);

  if (!nativeOk) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.warn}>{status}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Preparing haptics…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>torch-haptics example</Text>
        <Text style={styles.status}>{status}</Text>
        <View style={styles.row}>
          <Button
            title="Play transient"
            onPress={onPlayTransient}
            disabled={!ready}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
  },
  scroll: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },
  status: {
    fontSize: 15,
    color: "#333",
    marginBottom: 20,
  },
  hint: {
    marginTop: 12,
    textAlign: "center",
  },
  warn: {
    padding: 24,
    fontSize: 16,
  },
  row: {
    gap: 12,
  },
});
