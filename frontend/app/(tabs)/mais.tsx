import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CalendarCheck, Drop, Warning, FileText, CaretRight } from "phosphor-react-native";

import { useTheme, makeStyles, spacing, radius } from "@/src/theme";

export default function MaisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const items = [
    { icon: CalendarCheck, label: "Rotina do Dia", desc: "Tarefas de segunda a sábado", path: "/rotina", testID: "mais-rotina" },
    { icon: Drop, label: "Piscina (Sábados)", desc: "Registro semanal do prestador", path: "/piscina", testID: "mais-piscina" },
    { icon: Warning, label: "Ocorrências", desc: "Registrar e acompanhar problemas", path: "/ocorrencias", testID: "mais-ocorrencias" },
    { icon: FileText, label: "Histórico & Relatórios", desc: "PDF do dia, semana ou mês", path: "/historico", testID: "mais-historico" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Mais</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <Pressable
              key={it.label}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }, idx === 0 && { borderTopWidth: 0 }]}
              onPress={() => router.push(it.path as any)}
              testID={it.testID}
            >
              <View style={styles.iconBox}>
                <Icon color={colors.brandPrimary} size={22} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowDesc}>{it.desc}</Text>
              </View>
              <CaretRight color={colors.muted} size={18} weight="bold" />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  rowDesc: { fontSize: 12, color: c.muted, marginTop: 2 },
}));
