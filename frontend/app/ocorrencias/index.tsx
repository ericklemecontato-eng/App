import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CaretLeft, Plus, Check } from "phosphor-react-native";

import { api } from "@/src/api";
import type { Occurrence } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDateTimePt, STATUS_LABELS, OCCURRENCE_CATEGORIES } from "@/src/constants";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "aberta", label: "Abertas" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "resolvida", label: "Resolvidas" },
] as const;

export default function OcorrenciasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const q = useQuery<Occurrence[]>({
    queryKey: ["occurrences"],
    queryFn: async () => (await api.get("/occurrences")).data,
    refetchOnMount: true,
  });

  const resolveMut = useMutation({
    mutationFn: async (id: string) => (await api.put(`/occurrences/${id}`, { status: "resolvida" })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["occurrences"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const list = useMemo(() => {
    const rows = q.data ?? [];
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [q.data, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back} hitSlop={10} testID="occ-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <Text style={styles.title}>Ocorrências</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border }]}
              testID={`occ-filter-${f.id}`}
            >
              <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700", fontSize: 13 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        {list.length === 0 ? (
          <Text style={styles.empty}>Nenhuma ocorrência registrada.</Text>
        ) : (
          list.map((o) => (
            <View key={o.id} style={styles.card} testID={`occ-${o.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <View style={[styles.pill, { backgroundColor: priorityColor(o.priority, colors) }]}>
                  <Text style={styles.pillTxt}>{o.priority}</Text>
                </View>
              </View>
              {o.description ? <Text style={styles.desc}>{o.description}</Text> : null}
              <Text style={styles.meta}>
                {OCCURRENCE_CATEGORIES.find((c) => c.id === o.category)?.label ?? o.category}
                {o.floor_number ? ` • ${o.floor_number}º andar` : ""}
                {o.location ? ` • ${o.location}` : ""}
              </Text>
              <Text style={styles.meta}>{formatDateTimePt(o.created_at)}</Text>
              <View style={styles.rowBottom}>
                <View style={[styles.statusPill, { backgroundColor: o.status === "resolvida" ? colors.success : colors.warning }]}>
                  <Text style={styles.statusTxt}>{STATUS_LABELS[o.status] ?? o.status}</Text>
                </View>
                {o.status !== "resolvida" && o.status !== "cancelada" ? (
                  <Pressable style={styles.resolveBtn} onPress={() => resolveMut.mutate(o.id)} testID={`resolve-occ-${o.id}`}>
                    <Check color={colors.onSuccess} size={14} weight="bold" />
                    <Text style={styles.resolveTxt}>Resolver</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.fabBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.fab} onPress={() => router.push("/ocorrencias/nova" as any)} testID="btn-new-occ">
          <Plus color={colors.onBrandPrimary} size={20} weight="bold" />
          <Text style={styles.fabTxt}>Nova Ocorrência</Text>
        </Pressable>
      </View>
    </View>
  );
}

function priorityColor(p: string, c: any) {
  if (p === "urgente") return c.error;
  if (p === "alta") return c.warning;
  if (p === "media") return c.info;
  return c.muted;
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
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: c.muted, textAlign: "center", padding: spacing.xl },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface, flex: 1 },
  desc: { fontSize: 13, color: c.onSurfaceSecondary, marginTop: 4 },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, marginLeft: spacing.sm },
  pillTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  resolveBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.success, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  resolveTxt: { color: c.onSuccess, fontWeight: "800", fontSize: 12 },
  fabBar: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 0, paddingTop: spacing.sm },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    minHeight: 56,
    borderRadius: radius.md,
  },
  fabTxt: { color: c.onBrandPrimary, fontWeight: "800" },
}));
