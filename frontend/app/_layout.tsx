import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="andar/[number]" options={{ presentation: "card" }} />
                <Stack.Screen name="chaves/nova" options={{ presentation: "modal" }} />
                <Stack.Screen name="chaves/[id]" options={{ presentation: "card" }} />
                <Stack.Screen name="ocorrencias/index" options={{ presentation: "card" }} />
                <Stack.Screen name="ocorrencias/nova" options={{ presentation: "modal" }} />
                <Stack.Screen name="rotina/index" options={{ presentation: "card" }} />
                <Stack.Screen name="rotina/nova" options={{ presentation: "modal" }} />
                <Stack.Screen name="piscina/index" options={{ presentation: "card" }} />
                <Stack.Screen name="piscina/[date]" options={{ presentation: "card" }} />
                <Stack.Screen name="historico/index" options={{ presentation: "card" }} />
              </Stack>
            </KeyboardProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
