import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, Camera, Image as ImageIcon } from "phosphor-react-native";

import { api } from "@/src/api";
import type { PoolRecord } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDatePt } from "@/src/constants";
import { pickFromCamera, pickFromGallery } from "@/src/photos";

const ATTENDED = [
  { id: "sim", label: "Compareceu" },
  { id: "parcial", label: "Parcial" },
  { id: "nao", label: "Não compareceu" },
  { id: "reagendado", label: "Reagendado" },
] as const;

const CHECKLIST_KEYS: { key: string; label: string }[] = [
  { key: "comparecimento", label: "Comparecimento confirmado" },
  { key: "servico_realizado", label: "Serviço realizado conforme combinado" },
  { key: "irregularidades", label: "Irregularidades observadas" },
  { key: "necessita_retorno", label: "Necessidade de retorno" },
  { key: "concluido", label: "Serviço concluído" },
];

export default function PoolDateScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<PoolRecord>>({});

  const q = useQuery<PoolRecord>({
    queryKey: ["pool-record", date],
    queryFn: async () => (await api.get(`/pool/${date}`)).data,
    enabled: !!date,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: async () => (await api.post("/pool", { scheduled_date: date, ...form })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool"] });
      qc.invalidateQueries({ queryKey: ["pool-record", date] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      (router.canGoBack() ? router.back() : router.replace("/"));
    },
  });

  const updateChecklist = (k: string, v: boolean) => {
    setForm((p) => ({ ...p, checklist: { ...(p.checklist ?? {}), [k]: v } }));
  };

  const addPhoto = async (fromCam: boolean) => {
    const uri = await (fromCam ? pickFromCamera() : pickFromGallery());
    if (!uri) return;
    setForm((p) => ({ ...p, photos: [...(p.photos ?? []), uri] }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back} hitSlop={10} testID="pool-detail-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Piscina</Text>
          <Text style={styles.subtitle}>{formatDatePt(date ?? "")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        <Text style={styles.q}>O prestador compareceu?</Text>
        <View style={styles.optsRow}>
          {ATTENDED.map((a) => {
            const active = form.attended === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setForm((p) => ({ ...p, attended: a.id as any }))}
                style={[
                  styles.optBtn,
                  {
                    backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
                    borderColor: active ? colors.brandPrimary : colors.border,
                  },
                ]}
                testID={`attended-${a.id}`}
              >
                <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700" }}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Section title="Prestador">
          <Field v={form.provider_name ?? ""} ph="Nome do prestador" onC={(v) => setForm((p) => ({ ...p, provider_name: v }))} tid="pool-provider" />
          <Field v={form.company ?? ""} ph="Empresa (opcional)" onC={(v) => setForm((p) => ({ ...p, company: v }))} tid="pool-company" />
          <Field v={form.arrival_time ?? ""} ph="Horário de chegada (HH:MM)" onC={(v) => setForm((p) => ({ ...p, arrival_time: v }))} tid="pool-arrival" />
          <Field v={form.departure_time ?? ""} ph="Horário de saída (HH:MM)" onC={(v) => setForm((p) => ({ ...p, departure_time: v }))} tid="pool-departure" />
          <Field v={form.service_description ?? ""} ph="Serviço realizado" onC={(v) => setForm((p) => ({ ...p, service_description: v }))} multi tid="pool-service" />
          <Field v={form.observations ?? ""} ph="Observações" onC={(v) => setForm((p) => ({ ...p, observations: v }))} multi tid="pool-obs" />
        </Section>

        <Section title="Checklist">
          {CHECKLIST_KEYS.map((it) => {
            const v = !!form.checklist?.[it.key];
            return (
              <Pressable
                key={it.key}
                onPress={() => updateChecklist(it.key, !v)}
                style={styles.cklRow}
                testID={`ckl-${it.key}`}
              >
                <View style={[styles.ckBox, { backgroundColor: v ? colors.success : colors.surface, borderColor: v ? colors.success : colors.borderStrong }]}>
                  {v ? <Text style={{ color: colors.onSuccess, fontWeight: "900" }}>✓</Text> : null}
                </View>
                <Text style={styles.cklLabel}>{it.label}</Text>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Fotos">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable style={styles.photoBtn} onPress={() => addPhoto(true)} testID="pool-camera">
              <Camera color={colors.brandPrimary} size={18} weight="bold" />
              <Text style={styles.photoTxt}>Câmera</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => addPhoto(false)} testID="pool-gallery">
              <ImageIcon color={colors.brandPrimary} size={18} weight="bold" />
              <Text style={styles.photoTxt}>Galeria</Text>
            </Pressable>
          </View>
          {(form.photos ?? []).length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {(form.photos ?? []).map((p, i) => (
                <Image key={i} source={{ uri: p }} style={styles.thumb} />
              ))}
            </ScrollView>
          ) : null}
        </Section>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={() => mut.mutate()}
          disabled={mut.isPending}
          testID="pool-save"
        >
          <Text style={styles.saveTxt}>{mut.isPending ? "Salvando..." : "Salvar registro"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.secTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ v, ph, onC, multi, tid }: { v: string; ph: string; onC: (s: string) => void; multi?: boolean; tid: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TextInput
      value={v}
      onChangeText={onC}
      placeholder={ph}
      placeholderTextColor={colors.muted}
      style={[styles.input, multi && { minHeight: 70 }]}
      multiline={multi}
      testID={tid}
    />
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
  back: { padding: 6 },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
  q: { fontSize: 15, fontWeight: "700", color: c.onSurface, marginBottom: spacing.sm },
  optsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secTitle: { fontSize: 13, fontWeight: "800", color: c.muted, textTransform: "uppercase", marginBottom: spacing.sm },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: c.onSurface,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  cklRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  ckBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  cklLabel: { color: c.onSurface, fontSize: 14, flex: 1 },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: c.brandTertiary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 40,
  },
  photoTxt: { color: c.brandPrimary, fontWeight: "700" },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
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
