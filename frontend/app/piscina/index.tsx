import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CaretLeft, Drop, Check, X as XIcon, Clock } from "phosphor-react-native";

import { api } from "@/src/api";
import type { PoolRecord } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDatePt, nextSaturdayISO } from "@/src/constants";

export default function PiscinaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const q = useQuery<PoolRecord[]>({
    queryKey: ["pool"],
    queryFn: async () => (await api.get("/pool")).data,
    refetchOnMount: true,
  });

  const list = q.data ?? [];
  const next = nextSaturdayISO();
  const hasNext = list.find((p) => p.scheduled_date === next);
  const items = hasNext ? list : [{ id: "next", scheduled_date: next, status: "pendente", attended: null, checklist: {}, photos: [] } as any, ...list];

  const totals = list.reduce(
    (acc, p) => {
      if (p.attended === "sim") acc.ok += 1;
      else if (p.attended === "nao") acc.falta += 1;
      else if (p.attended === "parcial") acc.parcial += 1;
      else if (p.attended === "reagendado") acc.reag += 1;
      return acc;
    },
    { ok: 0, falta: 0, parcial: 0, reag: 0 },
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back} hitSlop={10} testID="pool-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Limpeza da Piscina</Text>
          <Text style={styles.subtitle}>Prestador — sábados</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}>
        <View style={styles.statsBox}>
          <Stat label="Comparecimentos" value={totals.ok} color={colors.success} />
          <Stat label="Faltas" value={totals.falta} color={colors.error} />
          <Stat label="Parciais" value={totals.parcial} color={colors.warning} />
          <Stat label="Reagendados" value={totals.reag} color={colors.info} />
        </View>

        {items.map((p: PoolRecord) => (
          <Pressable
            key={p.scheduled_date}
            style={styles.card}
            onPress={() => router.push(`/piscina/${p.scheduled_date}` as any)}
            testID={`pool-${p.scheduled_date}`}
          >
            <Drop color={colors.info} size={28} weight="duotone" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{formatDatePt(p.scheduled_date)}</Text>
              <Text style={styles.cardMeta}>
                {p.attended === "sim"
                  ? "Compareceu"
                  : p.attended === "nao"
                  ? "Não compareceu"
                  : p.attended === "parcial"
                  ? "Compareceu parcialmente"
                  : p.attended === "reagendado"
                  ? "Reagendado"
                  : "Pendente"}
                {p.provider_name ? ` • ${p.provider_name}` : ""}
              </Text>
            </View>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor:
                    p.attended === "sim"
                      ? colors.success
                      : p.attended === "nao"
                      ? colors.error
                      : p.attended === "parcial"
                      ? colors.warning
                      : p.attended === "reagendado"
                      ? colors.info
                      : colors.muted,
                },
              ]}
            >
              <Text style={styles.pillTxt}>
                {p.attended === "sim" ? "OK" : p.attended === "nao" ? "Falta" : p.attended === "parcial" ? "Parcial" : p.attended === "reagendado" ? "Reag." : "Pendente"}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  back: { padding: 6 },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
  statsBox: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, color: c.muted, textAlign: "center", marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    minHeight: 68,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  cardMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  pillTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
}));
