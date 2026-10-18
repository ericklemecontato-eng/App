import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X, Camera, Image as ImageIcon } from "phosphor-react-native";

import { api } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { OCCURRENCE_CATEGORIES, PRIORITIES } from "@/src/constants";
import { pickFromCamera, pickFromGallery } from "@/src/photos";

export default function NovaOcorrenciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    floor_number: "",
    category: "outros",
    priority: "media",
    photos: [] as string[],
  });

  const mut = useMutation({
    mutationFn: async () =>
      (await api.post("/occurrences", {
        ...form,
        floor_number: form.floor_number ? parseInt(form.floor_number, 10) : null,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["occurrences"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      (router.canGoBack() ? router.back() : router.replace("/"));
    },
  });

  const addPhoto = async (cam: boolean) => {
    const uri = await (cam ? pickFromCamera() : pickFromGallery());
    if (!uri) return;
    setForm((p) => ({ ...p, photos: [...p.photos, uri] }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Nova Ocorrência</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.close} testID="close-occ">
          <X color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        <Lbl label="Título *" />
        <TextInput value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} style={styles.input} placeholderTextColor={colors.muted} testID="occ-title" />
        <Lbl label="Descrição" />
        <TextInput value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} style={[styles.input, { minHeight: 80 }]} multiline testID="occ-desc" />
        <Lbl label="Localização" />
        <TextInput value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} style={styles.input} testID="occ-loc" />
        <Lbl label="Andar (1-14, opcional)" />
        <TextInput value={form.floor_number} onChangeText={(v) => setForm((p) => ({ ...p, floor_number: v.replace(/[^0-9]/g, "") }))} style={styles.input} keyboardType="number-pad" testID="occ-floor" />

        <Lbl label="Categoria" />
        <View style={styles.chipWrap}>
          {OCCURRENCE_CATEGORIES.map((c) => {
            const active = form.category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setForm((p) => ({ ...p, category: c.id }))}
                style={[styles.chip, { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border }]}
                testID={`occ-cat-${c.id}`}
              >
                <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontSize: 12, fontWeight: "700" }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Lbl label="Prioridade" />
        <View style={styles.chipWrap}>
          {PRIORITIES.map((p) => {
            const active = form.priority === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setForm((f) => ({ ...f, priority: p.id }))}
                style={[styles.chip, { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border }]}
                testID={`occ-prio-${p.id}`}
              >
                <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontSize: 12, fontWeight: "700" }}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Lbl label="Fotos" />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable style={styles.photoBtn} onPress={() => addPhoto(true)} testID="occ-camera">
            <Camera color={colors.brandPrimary} size={18} weight="bold" />
            <Text style={styles.photoTxt}>Câmera</Text>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => addPhoto(false)} testID="occ-gallery">
            <ImageIcon color={colors.brandPrimary} size={18} weight="bold" />
            <Text style={styles.photoTxt}>Galeria</Text>
          </Pressable>
        </View>
        {form.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
            {form.photos.map((p, i) => (
              <Image key={i} source={{ uri: p }} style={styles.thumb} />
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={() => form.title && mut.mutate()}
          disabled={mut.isPending || !form.title}
          testID="submit-occ"
        >
          <Text style={styles.saveTxt}>{mut.isPending ? "Salvando..." : "Salvar ocorrência"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Lbl({ label }: { label: string }) {
  const styles = useStyles();
  return <Text style={styles.lbl}>{label}</Text>;
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
  lbl: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary, marginTop: spacing.sm, marginBottom: 6 },
  input: { backgroundColor: c.surfaceSecondary, borderRadius: radius.sm, padding: spacing.md, color: c.onSurface, borderWidth: 1, borderColor: c.border, minHeight: 48 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, minHeight: 36, alignItems: "center", justifyContent: "center" },
  photoBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
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
  saveBtn: { backgroundColor: c.brandPrimary, minHeight: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saveTxt: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 16 },
}));
