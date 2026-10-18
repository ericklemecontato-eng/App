import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X } from "phosphor-react-native";

import { api } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";

export default function NovaChaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    employee_name: "",
    company: "",
    role: "",
    apartment: "",
    key_identifier: "",
    reason: "",
    checkout_handler: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => (await api.post("/keys/checkout", form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      (router.canGoBack() ? router.back() : router.replace("/"));
    },
    onError: (e: any) => setError(e?.response?.data?.detail ?? "Erro ao salvar"),
  });

  const submit = () => {
    if (!form.employee_name || !form.apartment || !form.key_identifier || !form.reason) {
      setError("Preencha os campos obrigatórios.");
      return;
    }
    setError(null);
    mut.mutate();
  };

  const F = (
    key: keyof typeof form,
    label: string,
    opts: { placeholder?: string; required?: boolean; multiline?: boolean } = {},
  ) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>
        {label} {opts.required ? <Text style={{ color: colors.error }}>*</Text> : null}
      </Text>
      <TextInput
        placeholder={opts.placeholder ?? label}
        placeholderTextColor={colors.muted}
        value={form[key]}
        onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
        style={[styles.input, opts.multiline && { minHeight: 80 }]}
        multiline={opts.multiline}
        testID={`field-${key}`}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Nova Retirada</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.closeBtn} testID="close-nova">
          <X color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {F("employee_name", "Nome do funcionário", { required: true })}
        {F("company", "Empresa / local de trabalho")}
        {F("role", "Cargo ou função")}
        {F("apartment", "Apartamento", { required: true, placeholder: "Ex: 302" })}
        {F("key_identifier", "Identificação da chave", { required: true, placeholder: "Ex: Ch-302" })}
        {F("reason", "Motivo da retirada", { required: true, multiline: true })}
        {F("checkout_handler", "Zelador responsável pela entrega")}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={submit}
          disabled={mut.isPending}
          testID="submit-checkout"
        >
          <Text style={styles.saveTxt}>{mut.isPending ? "Salvando..." : "Registrar Retirada"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  closeBtn: { padding: 6 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary, marginBottom: 6 },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: c.onSurface,
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.border,
    fontSize: 15,
  },
  error: { color: c.error, textAlign: "center", marginTop: spacing.sm, fontWeight: "600" },
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
