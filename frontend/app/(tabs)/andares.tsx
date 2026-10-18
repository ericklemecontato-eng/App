import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { api } from "@/src/api";
import type { Floor } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";

export default function AndaresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const q = useQuery<Floor[]>({
    queryKey: ["floors"],
    queryFn: async () => (await api.get("/floors")).data,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const floors = q.data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Andares do Prédio</Text>
        <Text style={styles.subtitle}>14 andares • toque para abrir o checklist</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        testID="andares-scroll"
      >
        {floors.map((f) => {
          const pend = (f.active_items ?? []).filter((i) => !i.resolved && i.status === "problema").length;
          const statusColor =
            f.status === "com_pendencias"
              ? colors.error
              : f.status === "sem_pendencias"
              ? colors.success
              : colors.muted;
          return (
            <Pressable
              key={f.number}
              style={({ pressed }) => [styles.floorCard, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/andar/${f.number}` as any)}
              testID={`floor-card-${f.number}`}
            >
              {pend > 0 ? (
                <View style={styles.badge} testID={`floor-badge-${f.number}`}>
                  <Text style={styles.badgeText}>{pend}</Text>
                </View>
              ) : null}
              <Text style={styles.floorNumber}>{f.number}º</Text>
              <Text style={styles.floorLabel}>andar</Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.statusLabel}>
                {f.status === "com_pendencias"
                  ? "Com pendências"
                  : f.status === "sem_pendencias"
                  ? "OK"
                  : "Não inspecionado"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  floorCard: {
    width: "47%",
    minHeight: 130,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: c.onError, fontSize: 12, fontWeight: "800" },
  floorNumber: { fontSize: 36, fontWeight: "900", color: c.onSurface },
  floorLabel: { fontSize: 13, color: c.muted, marginTop: -4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: spacing.sm },
  statusLabel: { fontSize: 12, color: c.onSurfaceSecondary, marginTop: 4 },
}));
