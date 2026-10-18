import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Buildings,
  Key,
  Drop,
  CalendarCheck,
  Warning,
  Lightbulb,
  Wrench,
  ClipboardText,
  Image as ImageIcon,
  ChartBar,
} from "phosphor-react-native";

import { api } from "@/src/api";
import type { Summary } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { WEEKDAYS_FULL, formatDatePt } from "@/src/constants";

const HERO_IMG = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDB8fHx8MTc5MjM1MjA2MXww&ixlib=rb-4.1.0&q=85";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const summaryQ = useQuery<Summary>({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/summary")).data,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const condoQ = useQuery({
    queryKey: ["condominium"],
    queryFn: async () => (await api.get("/condominium")).data,
  });

  const now = new Date();
  const dayName = WEEKDAYS_FULL[now.getDay()];
  const dateStr = formatDatePt(now.toISOString());
  const s = summaryQ.data;

  const totals = [
    { label: "Tarefas hoje", value: s?.tasks_today_total ?? 0, color: colors.brandPrimary, testID: "stat-tasks-today" },
    { label: "Concluídas", value: s?.tasks_today_done ?? 0, color: colors.success, testID: "stat-tasks-done" },
    { label: "Pendentes", value: s?.tasks_today_pending ?? 0, color: colors.warning, testID: "stat-tasks-pending" },
    { label: "Atrasadas", value: s?.overdue_tasks ?? 0, color: colors.error, testID: "stat-tasks-overdue" },
    { label: "Ocorrências", value: s?.open_occurrences ?? 0, color: colors.info, testID: "stat-occurrences" },
    { label: "Chaves em posse", value: s?.pending_keys ?? 0, color: colors.warning, testID: "stat-keys-pending" },
  ];

  const actions = [
    { label: "Rotina do Dia", icon: CalendarCheck, path: "/rotina", testID: "action-rotina" },
    { label: "Andares", icon: Buildings, path: "/andares", testID: "action-andares" },
    { label: "Controle de Chaves", icon: Key, path: "/chaves", testID: "action-chaves" },
    { label: "Piscina (Sábados)", icon: Drop, path: "/piscina", testID: "action-piscina" },
    { label: "Ocorrências", icon: Warning, path: "/ocorrencias", testID: "action-ocorrencias" },
    { label: "Lâmpadas Queimadas", icon: Lightbulb, path: "/andares", testID: "action-lampadas" },
    { label: "Nova Tarefa", icon: Wrench, path: "/rotina/nova", testID: "action-nova-tarefa" },
    { label: "Mais", icon: ImageIcon, path: "/mais", testID: "action-mais" },
    { label: "Histórico & Relatórios", icon: ChartBar, path: "/historico", testID: "action-historico" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        testID="home-scroll"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: HERO_IMG }} style={styles.heroImg} />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(17,24,39,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.heroHello} testID="home-day-name">
              {dayName}
            </Text>
            <Text style={styles.heroDate} testID="home-date">
              {dateStr}
            </Text>
            <Text style={styles.heroCondo} testID="home-condo-name">
              {condoQ.data?.name ?? "Meu Condomínio"}
            </Text>
          </View>
        </View>

        {/* Totals row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {totals.map((t) => (
            <View key={t.label} style={styles.statCard} testID={t.testID}>
              <Text style={[styles.statValue, { color: t.color }]}>{t.value}</Text>
              <Text style={styles.statLabel}>{t.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Alerts */}
        {s && s.total_lamps > 0 ? (
          <View style={styles.alertCard} testID="home-alert-lamps">
            <Lightbulb color={colors.warning} size={22} weight="fill" />
            <Text style={styles.alertText}>
              {s.total_lamps} {s.total_lamps === 1 ? "lâmpada queimada" : "lâmpadas queimadas"} no prédio
            </Text>
          </View>
        ) : null}

        {/* Action grid */}
        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.grid}>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Pressable
                key={a.label}
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(a.path as any)}
                testID={a.testID}
              >
                <View style={styles.actionIconBox}>
                  <Icon color={colors.brandPrimary} size={28} weight="duotone" />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Status geral</Text>
        <View style={styles.statusList}>
          <StatusRow label="Lâmpadas queimadas" value={s?.total_lamps ?? 0} />
          <StatusRow label="Problemas hidráulicos" value={s?.total_hidraulica ?? 0} />
          <StatusRow label="Problemas elétricos aparentes" value={s?.total_eletrica ?? 0} />
          <StatusRow label="Problemas de limpeza" value={s?.total_limpeza ?? 0} />
          <StatusRow label="Problemas de conservação" value={s?.total_conservacao ?? 0} />
          <StatusRow label="Ocorrências abertas" value={s?.open_occurrences ?? 0} />
          <StatusRow label="Ocorrências resolvidas" value={s?.resolved_occurrences ?? 0} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatusRow({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  hero: { height: 200, backgroundColor: c.surfaceSecondary },
  heroImg: { width: "100%", height: "100%" },
  heroContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    padding: spacing.lg,
    justifyContent: "flex-end",
  },
  heroHello: { color: "#FFFFFF", fontSize: 14, opacity: 0.9, textTransform: "capitalize" },
  heroDate: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: 2 },
  heroCondo: { color: "#FFFFFF", fontSize: 15, opacity: 0.9, marginTop: 4 },

  statsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md },
  statCard: {
    flexShrink: 0,
    minWidth: 110,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, color: c.muted, marginTop: 2 },

  alertCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: c.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  alertText: { color: c.onSurface, fontSize: 14, fontWeight: "600", flex: 1 },

  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 13,
    fontWeight: "700",
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionCard: {
    width: "47%",
    minHeight: 110,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: c.border,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 14, fontWeight: "700", color: c.onSurface, marginTop: spacing.sm },

  statusList: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  statusLabel: { color: c.onSurface, fontSize: 14 },
  statusValue: { color: c.onSurface, fontSize: 16, fontWeight: "700" },
}));
