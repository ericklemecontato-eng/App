import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CaretLeft, Plus, Check, Clock } from "phosphor-react-native";

import { api } from "@/src/api";
import type { RoutineTask } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { todayISO, WEEKDAYS_FULL, formatDatePt } from "@/src/constants";

export default function RotinaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const today = todayISO();

  const q = useQuery<RoutineTask[]>({
    queryKey: ["routine", today],
    queryFn: async () => (await api.get(`/routine?date=${today}`)).data,
    refetchOnMount: true,
  });

  const all = useQuery<RoutineTask[]>({
    queryKey: ["routine-all"],
    queryFn: async () => (await api.get(`/routine`)).data,
    refetchOnMount: true,
  });

  const toggleMut = useMutation({
    mutationFn: async (t: RoutineTask) =>
      (await api.put(`/routine/${t.id}`, { status: t.status === "concluida" ? "pendente" : "concluida" })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine", today] });
      qc.invalidateQueries({ queryKey: ["routine-all"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/routine/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine", today] });
      qc.invalidateQueries({ queryKey: ["routine-all"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const now = new Date();
  const todayList = q.data ?? [];
  const overdue = (all.data ?? []).filter((t) => t.date < today && t.status !== "concluida");

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.backBtn} hitSlop={10} testID="rotina-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rotina do Dia</Text>
          <Text style={styles.subtitle}>
            {WEEKDAYS_FULL[now.getDay()]} • {formatDatePt(now.toISOString())}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        {overdue.length > 0 ? (
          <>
            <Text style={styles.section}>Atrasadas ({overdue.length})</Text>
            {overdue.map((t) => (
              <TaskRow key={t.id} t={t} onToggle={() => toggleMut.mutate(t)} onDelete={() => delMut.mutate(t.id)} overdue />
            ))}
          </>
        ) : null}

        <Text style={styles.section}>Hoje ({todayList.length})</Text>
        {todayList.length === 0 ? (
          <Text style={styles.empty}>Nenhuma tarefa cadastrada para hoje.</Text>
        ) : (
          todayList.map((t) => (
            <TaskRow key={t.id} t={t} onToggle={() => toggleMut.mutate(t)} onDelete={() => delMut.mutate(t.id)} />
          ))
        )}
      </ScrollView>

      <View style={[styles.fabBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.fab} onPress={() => router.push("/rotina/nova" as any)} testID="btn-new-task">
          <Plus color={colors.onBrandPrimary} size={20} weight="bold" />
          <Text style={styles.fabTxt}>Nova Tarefa</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TaskRow({ t, onToggle, onDelete, overdue }: { t: RoutineTask; onToggle: () => void; onDelete: () => void; overdue?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const done = t.status === "concluida";
  return (
    <View style={[styles.taskRow, overdue && { borderColor: colors.error, borderWidth: 1 }]} testID={`task-${t.id}`}>
      <Pressable
        onPress={onToggle}
        style={[styles.check, { backgroundColor: done ? colors.success : colors.surface, borderColor: done ? colors.success : colors.borderStrong }]}
        testID={`task-${t.id}-toggle`}
      >
        {done ? <Check color={colors.onSuccess} size={16} weight="bold" /> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskName, done && { textDecorationLine: "line-through", color: colors.muted }]}>{t.name}</Text>
        {t.location ? <Text style={styles.taskMeta}>{t.location}</Text> : null}
        {t.planned_time ? (
          <View style={styles.timeRow}>
            <Clock color={colors.muted} size={12} weight="bold" />
            <Text style={styles.taskMeta}>{t.planned_time}</Text>
          </View>
        ) : null}
        {overdue ? <Text style={[styles.taskMeta, { color: colors.error }]}>Atrasada • {formatDatePt(t.date)}</Text> : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={8} testID={`task-${t.id}-del`}>
        <Text style={{ color: colors.error, fontSize: 20 }}>×</Text>
      </Pressable>
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
  backBtn: { padding: 6 },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2, textTransform: "capitalize" },
  section: {
    fontSize: 13,
    fontWeight: "800",
    color: c.muted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { color: c.muted, textAlign: "center", padding: spacing.xl },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  taskName: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  taskMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
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
  fabTxt: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 15 },
}));
