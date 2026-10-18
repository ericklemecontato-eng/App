import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, Check } from "phosphor-react-native";

import { api } from "@/src/api";
import type { KeyLog } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDateTimePt } from "@/src/constants";

export default function KeyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [receiver, setReceiver] = useState("");
  const [state, setState] = useState("Boa");
  const [obs, setObs] = useState("");

  const q = useQuery<KeyLog>({
    queryKey: ["key", id],
    queryFn: async () => (await api.get(`/keys/${id}`)).data,
    enabled: !!id,
  });

  const mut = useMutation({
    mutationFn: async () =>
      (await api.post(`/keys/${id}/return`, {
        return_receiver: receiver,
        key_state: state,
        return_observations: obs,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["key", id] });
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      (router.canGoBack() ? router.back() : router.replace("/"));
    },
  });

  const k = q.data;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.backBtn} hitSlop={10} testID="key-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <Text style={styles.title}>Detalhes da Chave</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 180 + insets.bottom }}>
        {k ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Funcionário</Text>
              <Text style={styles.cardValue}>{k.employee_name}</Text>
              {k.company ? <Text style={styles.cardMeta}>{k.company}</Text> : null}
              {k.role ? <Text style={styles.cardMeta}>{k.role}</Text> : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Chave</Text>
              <Text style={styles.cardValue}>Apto. {k.apartment}</Text>
              <Text style={styles.cardMeta}>Identificação: {k.key_identifier}</Text>
              <Text style={styles.cardMeta}>Motivo: {k.reason}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status atual</Text>
              <Text style={[styles.cardValue, { color: k.returned ? colors.success : colors.warning }]}>
                {k.returned ? "Devolvida" : "Em posse do funcionário"}
              </Text>
              <Text style={styles.cardMeta}>Retirada: {formatDateTimePt(k.checkout_date)}</Text>
              {k.returned && k.return_date ? (
                <Text style={styles.cardMeta}>Devolução: {formatDateTimePt(k.return_date)}</Text>
              ) : null}
              {k.returned && k.return_receiver ? (
                <Text style={styles.cardMeta}>Recebido por: {k.return_receiver}</Text>
              ) : null}
            </View>

            {!k.returned ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Registrar devolução</Text>
                <Text style={styles.label}>Nome de quem recebeu *</Text>
                <TextInput
                  value={receiver}
                  onChangeText={setReceiver}
                  placeholder="Ex: Zelador João"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="return-receiver"
                />
                <Text style={styles.label}>Estado da chave</Text>
                <TextInput
                  value={state}
                  onChangeText={setState}
                  placeholder="Boa / Danificada"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="return-state"
                />
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  value={obs}
                  onChangeText={setObs}
                  style={[styles.input, { minHeight: 60 }]}
                  multiline
                  testID="return-obs"
                />
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Histórico</Text>
              {(k.history ?? []).map((h, i) => (
                <Text key={i} style={styles.cardMeta}>
                  {h.action === "retirada" ? "Retirada" : "Devolução"} • {formatDateTimePt(h.at)}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.cardMeta}>Carregando…</Text>
        )}
      </ScrollView>

      {k && !k.returned ? (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
            onPress={() => mut.mutate()}
            disabled={mut.isPending || !receiver}
            testID="submit-return"
          >
            <Check color={colors.onBrandPrimary} size={18} weight="bold" />
            <Text style={styles.saveTxt}>{mut.isPending ? "Salvando..." : "Registrar devolução"}</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
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
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { fontSize: 12, color: c.muted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 },
  cardValue: { fontSize: 18, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  cardMeta: { fontSize: 14, color: c.onSurfaceSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: c.onSurface,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 44,
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
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.success,
    minHeight: 56,
    borderRadius: radius.md,
  },
  saveTxt: { color: c.onSuccess, fontWeight: "800", fontSize: 16 },
}));
