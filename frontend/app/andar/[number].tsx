import React, { useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, Camera, Image as ImageIcon, Check, Warning, MinusCircle, Clock, Plus } from "phosphor-react-native";

import { api } from "@/src/api";
import type { Floor } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { DEFAULT_CHECKLIST, CATEGORIES, formatDateTimePt } from "@/src/constants";
import { pickFromCamera, pickFromGallery } from "@/src/photos";

type ChecklistItemLocal = {
  id: string;
  category: string;
  title: string;
  status: "pendente" | "concluido" | "problema" | "nao_se_aplica";
  quantity: number;
  location: string;
  description: string;
  photos: string[];
  resolved: boolean;
  updated_at: string;
};

function buildDefaultItems(): ChecklistItemLocal[] {
  return DEFAULT_CHECKLIST.map((it, idx) => ({
    id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    category: it.category,
    title: it.title,
    status: "pendente",
    quantity: 0,
    location: "",
    description: "",
    photos: [],
    resolved: false,
    updated_at: new Date().toISOString(),
  }));
}

const STATUS_OPTIONS: { id: ChecklistItemLocal["status"]; label: string; color: (c: any) => string; Icon: any }[] = [
  { id: "pendente", label: "Pendente", color: (c) => c.muted, Icon: Clock },
  { id: "concluido", label: "Concluído", color: (c) => c.success, Icon: Check },
  { id: "problema", label: "Problema", color: (c) => c.error, Icon: Warning },
  { id: "nao_se_aplica", label: "N/A", color: (c) => c.borderStrong, Icon: MinusCircle },
];

export default function AndarScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const floorNumber = parseInt(number ?? "1", 10);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const [inspector, setInspector] = useState("");
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<ChecklistItemLocal[]>(buildDefaultItems());
  const [activeCat, setActiveCat] = useState("iluminacao");

  const floorQ = useQuery<Floor>({
    queryKey: ["floor", floorNumber],
    queryFn: async () => (await api.get(`/floors/${floorNumber}`)).data,
  });

  const historyQ = useQuery({
    queryKey: ["floor-history", floorNumber],
    queryFn: async () => (await api.get(`/floors/${floorNumber}/inspections`)).data,
  });

  const saveMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/floors/${floorNumber}/inspections`, {
        inspector_name: inspector || null,
        observations: observations || null,
        items: items.map((i) => ({
          ...i,
          location: i.location || null,
          description: i.description || null,
        })),
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floors"] });
      qc.invalidateQueries({ queryKey: ["floor", floorNumber] });
      qc.invalidateQueries({ queryKey: ["floor-history", floorNumber] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      setItems(buildDefaultItems());
      setObservations("");
    },
  });

  const resolveMut = useMutation({
    mutationFn: async (item_id: string) =>
      (await api.post(`/floors/${floorNumber}/resolve-item`, { item_id, resolved: true })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floors"] });
      qc.invalidateQueries({ queryKey: ["floor", floorNumber] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const filteredItems = useMemo(() => items.filter((i) => i.category === activeCat), [items, activeCat]);

  const updateItem = (id: string, patch: Partial<ChecklistItemLocal>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i)));
  };

  const addPhoto = async (id: string, fromCamera: boolean) => {
    const uri = await (fromCamera ? pickFromCamera() : pickFromGallery());
    if (!uri) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, photos: [...i.photos, uri] } : i)),
    );
  };

  const activeFloor = floorQ.data;
  const activeItems = activeFloor?.active_items ?? [];
  const activePending = activeItems.filter((i) => !i.resolved && i.status === "problema");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
          hitSlop={10}
          testID="floor-back"
        >
          <CaretLeft color={colors.onSurface} size={24} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>{floorNumber}º Andar</Text>
          <Text style={styles.topSubtitle}>
            {activeFloor?.last_inspection_date
              ? `Última: ${formatDateTimePt(activeFloor.last_inspection_date)}`
              : "Sem inspeções registradas"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        testID="floor-scroll"
      >
        {/* Active pendencies */}
        {activePending.length > 0 ? (
          <View style={styles.pendBox}>
            <Text style={styles.pendTitle}>Pendências ativas ({activePending.length})</Text>
            {activePending.map((it) => (
              <View key={it.id} style={styles.pendRow} testID={`pending-${it.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendItemTitle}>{it.title}</Text>
                  {it.description ? <Text style={styles.pendItemDesc}>{it.description}</Text> : null}
                  {it.quantity > 0 ? <Text style={styles.pendItemMeta}>Quantidade: {it.quantity}</Text> : null}
                  {it.location ? <Text style={styles.pendItemMeta}>Local: {it.location}</Text> : null}
                </View>
                <Pressable
                  style={styles.resolveBtn}
                  onPress={() => resolveMut.mutate(it.id)}
                  testID={`resolve-${it.id}`}
                >
                  <Check color={colors.onSuccess} size={16} weight="bold" />
                  <Text style={styles.resolveTxt}>Resolver</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Inspector input */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Nome do responsável pela inspeção</Text>
          <TextInput
            placeholder="Ex: João"
            placeholderTextColor={colors.muted}
            value={inspector}
            onChangeText={setInspector}
            style={styles.input}
            testID="inspector-input"
          />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCat === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCat(cat.id)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border },
                ]}
                testID={`cat-chip-${cat.id}`}
              >
                <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700", fontSize: 13 }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Checklist */}
        <View style={styles.section}>
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard} testID={`item-${item.id}`}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.Icon;
                  const active = item.status === opt.id;
                  const col = opt.color(colors);
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => updateItem(item.id, { status: opt.id })}
                      style={[
                        styles.statusBtn,
                        {
                          borderColor: active ? col : colors.border,
                          backgroundColor: active ? col : colors.surface,
                        },
                      ]}
                      testID={`item-${item.id}-status-${opt.id}`}
                    >
                      <Icon color={active ? "#FFFFFF" : col} size={14} weight="bold" />
                      <Text style={{ color: active ? "#FFFFFF" : colors.onSurface, fontSize: 12, fontWeight: "600" }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {item.status === "problema" ? (
                <View style={styles.problemBox}>
                  {item.category === "iluminacao" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <Text style={styles.smallLabel}>Qtd. queimadas:</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}
                        testID={`item-${item.id}-qty-minus`}
                      >
                        <Text style={styles.qtyBtnTxt}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyValue} testID={`item-${item.id}-qty`}>{item.quantity}</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                        testID={`item-${item.id}-qty-plus`}
                      >
                        <Text style={styles.qtyBtnTxt}>+</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <TextInput
                    placeholder="Localização (ex: próximo ao ap. 302)"
                    placeholderTextColor={colors.muted}
                    value={item.location}
                    onChangeText={(v) => updateItem(item.id, { location: v })}
                    style={styles.input}
                    testID={`item-${item.id}-location`}
                  />
                  <TextInput
                    placeholder="Descrição do problema"
                    placeholderTextColor={colors.muted}
                    value={item.description}
                    onChangeText={(v) => updateItem(item.id, { description: v })}
                    style={[styles.input, { minHeight: 60 }]}
                    multiline
                    testID={`item-${item.id}-desc`}
                  />
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      style={styles.photoBtn}
                      onPress={() => addPhoto(item.id, true)}
                      testID={`item-${item.id}-camera`}
                    >
                      <Camera color={colors.brandPrimary} size={16} weight="bold" />
                      <Text style={styles.photoBtnTxt}>Câmera</Text>
                    </Pressable>
                    <Pressable
                      style={styles.photoBtn}
                      onPress={() => addPhoto(item.id, false)}
                      testID={`item-${item.id}-gallery`}
                    >
                      <ImageIcon color={colors.brandPrimary} size={16} weight="bold" />
                      <Text style={styles.photoBtnTxt}>Galeria</Text>
                    </Pressable>
                  </View>
                  {item.photos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {item.photos.map((p, i) => (
                        <Image key={i} source={{ uri: p }} style={styles.thumb} />
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* Observations */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Observações gerais</Text>
          <TextInput
            placeholder="Observações da inspeção"
            placeholderTextColor={colors.muted}
            value={observations}
            onChangeText={setObservations}
            style={[styles.input, { minHeight: 80 }]}
            multiline
            testID="obs-input"
          />
        </View>

        {/* History */}
        {historyQ.data && historyQ.data.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de inspeções</Text>
            {historyQ.data.slice(0, 10).map((h: any) => (
              <View key={h.id} style={styles.histRow}>
                <Text style={styles.histDate}>{formatDateTimePt(h.date)}</Text>
                <Text style={styles.histInspector}>{h.inspector_name || "Sem responsável"}</Text>
                <Text style={styles.histItems}>
                  {(h.items ?? []).filter((it: any) => it.status === "problema").length} problemas registrados
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky save */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          testID="save-inspection"
        >
          <Text style={styles.saveTxt}>{saveMut.isPending ? "Salvando..." : "Salvar inspeção"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: { padding: 6 },
  topTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  topSubtitle: { fontSize: 12, color: c.muted, marginTop: 2 },

  pendBox: {
    margin: spacing.lg,
    backgroundColor: c.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  pendTitle: { fontSize: 14, fontWeight: "800", color: c.onSurface, marginBottom: spacing.sm },
  pendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  pendItemTitle: { color: c.onSurface, fontWeight: "700", fontSize: 14 },
  pendItemDesc: { color: c.onSurfaceSecondary, fontSize: 12 },
  pendItemMeta: { color: c.muted, fontSize: 12 },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  resolveTxt: { color: c.onSuccess, fontWeight: "700", fontSize: 12 },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: c.onSurface, marginBottom: spacing.sm },
  inputLabel: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary, marginBottom: 6 },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: c.onSurface,
    fontSize: 14,
    minHeight: 44,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },

  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  itemCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  itemTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface, marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 36,
  },
  problemBox: { marginTop: spacing.md, gap: spacing.sm },
  smallLabel: { fontSize: 13, color: c.onSurfaceSecondary, fontWeight: "600" },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnTxt: { color: c.onBrandPrimary, fontSize: 18, fontWeight: "800" },
  qtyValue: { fontSize: 18, fontWeight: "800", color: c.onSurface, minWidth: 32, textAlign: "center" },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: c.brandTertiary,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 40,
  },
  photoBtnTxt: { color: c.brandPrimary, fontWeight: "700", fontSize: 13 },
  thumb: { width: 70, height: 70, borderRadius: radius.sm, marginTop: 6 },

  histRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  histDate: { color: c.onSurface, fontSize: 13, fontWeight: "700" },
  histInspector: { color: c.onSurfaceSecondary, fontSize: 12 },
  histItems: { color: c.muted, fontSize: 12 },

  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  saveBtn: {
    backgroundColor: c.brandPrimary,
    borderRadius: radius.md,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  saveTxt: { color: c.onBrandPrimary, fontSize: 16, fontWeight: "800" },
}));
