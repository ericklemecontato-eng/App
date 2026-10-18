import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X } from "phosphor-react-native";

import { api } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { todayISO } from "@/src/constants";

export default function NovaTarefaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    planned_time: "",
    date: todayISO(),
  });

  const mut = useMutation({
    mutationFn: async () => (await api.post("/routine", form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine"] });
      qc.invalidateQueries({ queryKey: ["routine-all"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      (router.canGoBack() ? router.back() : router.replace("/"));
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Nova Tarefa</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.close} testID="close-task">
          <X color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        <Field label="Nome *" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} tid="task-name" />
        <Field label="Local" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} tid="task-loc" />
        <Field label="Descrição" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} multi tid="task-desc" />
        <Field label="Horário planejado (HH:MM)" value={form.planned_time} onChange={(v) => setForm((p) => ({ ...p, planned_time: v }))} tid="task-time" />
        <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} tid="task-date" />
      </ScrollView>
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={() => form.name && mut.mutate()}
          disabled={mut.isPending || !form.name}
          testID="submit-task"
        >
          <Text style={styles.saveTxt}>{mut.isPending ? "Salvando..." : "Salvar tarefa"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, multi, tid }: { label: string; value: string; onChange: (s: string) => void; multi?: boolean; tid: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.lbl}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, multi && { minHeight: 80 }]}
        multiline={multi}
        placeholderTextColor={colors.muted}
        testID={tid}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  close: { padding: 6 },
  lbl: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary, marginBottom: 6 },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: c.onSurface,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 48,
  },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  saveBtn: {
    backgroundColor: c.brandPrimary,
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveTxt: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 16 },
}));
