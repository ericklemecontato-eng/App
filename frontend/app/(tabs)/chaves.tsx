import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Plus, Key as KeyIcon, MagnifyingGlass, Clock, Check } from "phosphor-react-native";

import { api } from "@/src/api";
import type { KeyLog } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDateTimePt, hoursBetween } from "@/src/constants";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Em posse" },
  { id: "returned", label: "Devolvidas" },
] as const;

export default function ChavesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [search, setSearch] = useState("");

  const q = useQuery<KeyLog[]>({
    queryKey: ["keys"],
    queryFn: async () => (await api.get("/keys")).data,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const returnMut = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/keys/${id}/return`, { return_receiver: "Zelador", key_state: "Boa" })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const list = useMemo(() => {
    const rows = q.data ?? [];
    const byFilter = rows.filter((r) => {
      if (filter === "pending") return !r.returned;
      if (filter === "returned") return r.returned;
      return true;
    });
    if (!search.trim()) return byFilter;
    const s = search.toLowerCase();
    return byFilter.filter((r) =>
      [r.employee_name, r.company, r.apartment, r.key_identifier].some((x) => (x ?? "").toLowerCase().includes(s)),
    );
  }, [q.data, filter, search]);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Controle de Chaves</Text>
        <View style={styles.searchBox}>
          <MagnifyingGlass color={colors.muted} size={18} weight="bold" />
          <TextInput
            placeholder="Buscar por funcionário, apto, chave"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            testID="keys-search"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
                    borderColor: active ? colors.brandPrimary : colors.border,
                  },
                ]}
                testID={`keys-filter-${f.id}`}
              >
                <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700", fontSize: 13 }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        testID="keys-scroll"
      >
        {list.length === 0 ? (
          <View style={styles.empty}>
            <KeyIcon color={colors.muted} size={48} />
            <Text style={styles.emptyTxt}>Nenhuma chave encontrada</Text>
          </View>
        ) : (
          list.map((k) => {
            const hoursOut = hoursBetween(k.checkout_date, k.return_date ?? undefined ?? new Date().toISOString());
            const overdue = !k.returned && hoursOut >= 24;
            return (
              <Pressable
                key={k.id}
                style={[styles.keyCard, overdue && { borderColor: colors.error, borderWidth: 2 }]}
                onPress={() => router.push(`/chaves/${k.id}` as any)}
                testID={`key-${k.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.keyEmployee}>{k.employee_name}</Text>
                  <Text style={styles.keyMeta}>
                    Apto. {k.apartment} • Chave {k.key_identifier}
                  </Text>
                  {k.company ? <Text style={styles.keyMeta}>{k.company}</Text> : null}
                  <View style={styles.keyStatusRow}>
                    <Clock color={overdue ? colors.error : colors.muted} size={14} weight="bold" />
                    <Text style={[styles.keyTime, overdue && { color: colors.error, fontWeight: "700" }]}>
                      {k.returned ? `Devolvida em ${formatDateTimePt(k.return_date!)}` : `${hoursOut}h em posse`}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: k.returned ? colors.success : overdue ? colors.error : colors.warning },
                  ]}
                >
                  <Text style={styles.badgeTxt}>{k.returned ? "Devolvida" : "Em posse"}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FABs */}
      <View style={[styles.fabBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.fabPrimary}
          onPress={() => router.push("/chaves/nova" as any)}
          testID="btn-new-checkout"
        >
          <Plus color={colors.onBrandPrimary} size={20} weight="bold" />
          <Text style={styles.fabTxt}>Registrar Retirada</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { fontSize: 24, fontWeight: "800", color: c.onSurface, marginBottom: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    minHeight: 44,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: { flex: 1, color: c.onSurface, fontSize: 14 },
  filtersRow: { paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md },
  emptyTxt: { color: c.muted, fontSize: 14 },

  keyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 80,
  },
  keyEmployee: { color: c.onSurface, fontSize: 16, fontWeight: "800" },
  keyMeta: { color: c.onSurfaceSecondary, fontSize: 13, marginTop: 2 },
  keyStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  keyTime: { color: c.muted, fontSize: 12 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },

  fabBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    paddingTop: spacing.sm,
  },
  fabPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    minHeight: 56,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 15 },
}));
