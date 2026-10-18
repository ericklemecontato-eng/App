import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { CaretLeft, FileText, Download } from "phosphor-react-native";

import { api } from "@/src/api";
import { useTheme, makeStyles, spacing, radius } from "@/src/theme";
import { formatDateTimePt, STATUS_LABELS } from "@/src/constants";

const PERIODS = [
  { id: "daily", label: "Hoje" },
  { id: "weekly", label: "Semana" },
  { id: "monthly", label: "Mês" },
] as const;

export default function HistoricoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("daily");
  const [generating, setGenerating] = useState(false);

  const q = useQuery<any>({
    queryKey: ["report", period],
    queryFn: async () => (await api.get(`/reports/overview?period=${period}`)).data,
  });

  const generatePDF = async () => {
    if (!q.data) return;
    setGenerating(true);
    try {
      const d = q.data;
      const s = d.summary ?? {};
      const html = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; padding: 24px; }
            h1 { color: #1D4ED8; margin: 0 0 4px; }
            h2 { color: #1D4ED8; margin-top: 24px; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; }
            .meta { color: #6B7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E5E7EB; }
            th { background: #F3F4F6; color: #374151; }
            .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
            .pill { background: #EFF6FF; color: #1D4ED8; padding: 6px 10px; border-radius: 999px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Zelador Pro — Relatório ${PERIODS.find((p) => p.id === period)?.label}</h1>
          <div class="meta">Gerado em ${formatDateTimePt(d.generated_at)}</div>

          <h2>Resumo</h2>
          <div class="pills">
            <div class="pill">Lâmpadas queimadas: <b>${s.total_lamps ?? 0}</b></div>
            <div class="pill">Problemas hidráulicos: <b>${s.total_hidraulica ?? 0}</b></div>
            <div class="pill">Problemas elétricos: <b>${s.total_eletrica ?? 0}</b></div>
            <div class="pill">Problemas de limpeza: <b>${s.total_limpeza ?? 0}</b></div>
            <div class="pill">Ocorrências abertas: <b>${s.open_occurrences ?? 0}</b></div>
            <div class="pill">Ocorrências resolvidas: <b>${s.resolved_occurrences ?? 0}</b></div>
            <div class="pill">Chaves em posse: <b>${s.pending_keys ?? 0}</b></div>
            <div class="pill">Tarefas atrasadas: <b>${s.overdue_tasks ?? 0}</b></div>
          </div>

          <h2>Ocorrências no período (${(d.occurrences ?? []).length})</h2>
          <table>
            <tr><th>Título</th><th>Categoria</th><th>Andar</th><th>Status</th><th>Data</th></tr>
            ${(d.occurrences ?? []).map((o: any) => `
              <tr>
                <td>${o.title ?? ""}</td>
                <td>${o.category ?? ""}</td>
                <td>${o.floor_number ?? "-"}</td>
                <td>${STATUS_LABELS[o.status] ?? o.status}</td>
                <td>${formatDateTimePt(o.created_at)}</td>
              </tr>
            `).join("")}
          </table>

          <h2>Chaves (${(d.keys ?? []).length})</h2>
          <table>
            <tr><th>Funcionário</th><th>Empresa</th><th>Apto</th><th>Chave</th><th>Retirada</th><th>Devolução</th></tr>
            ${(d.keys ?? []).map((k: any) => `
              <tr>
                <td>${k.employee_name ?? ""}</td>
                <td>${k.company ?? "-"}</td>
                <td>${k.apartment ?? ""}</td>
                <td>${k.key_identifier ?? ""}</td>
                <td>${formatDateTimePt(k.checkout_date)}</td>
                <td>${k.return_date ? formatDateTimePt(k.return_date) : "<b>Em posse</b>"}</td>
              </tr>
            `).join("")}
          </table>

          <h2>Piscina (${(d.pool ?? []).length})</h2>
          <table>
            <tr><th>Data</th><th>Compareceu</th><th>Prestador</th><th>Status</th></tr>
            ${(d.pool ?? []).map((p: any) => `
              <tr>
                <td>${p.scheduled_date}</td>
                <td>${p.attended ?? "-"}</td>
                <td>${p.provider_name ?? "-"}</td>
                <td>${STATUS_LABELS[p.status] ?? p.status}</td>
              </tr>
            `).join("")}
          </table>

          <h2>Tarefas (${(d.tasks ?? []).length})</h2>
          <table>
            <tr><th>Nome</th><th>Local</th><th>Data</th><th>Status</th></tr>
            ${(d.tasks ?? []).map((t: any) => `
              <tr>
                <td>${t.name ?? ""}</td>
                <td>${t.location ?? "-"}</td>
                <td>${t.date}</td>
                <td>${STATUS_LABELS[t.status] ?? t.status}</td>
              </tr>
            `).join("")}
          </table>
        </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Relatório Zelador Pro" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const d = q.data;
  const s = d?.summary ?? {};

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back} hitSlop={10} testID="hist-back">
          <CaretLeft color={colors.onSurface} size={22} weight="bold" />
        </Pressable>
        <Text style={styles.title}>Histórico & Relatórios</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {PERIODS.map((p) => {
          const active = period === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPeriod(p.id)}
              style={[styles.chip, { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border }]}
              testID={`hist-period-${p.id}`}
            >
              <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700" }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}>
        <View style={styles.summaryGrid}>
          <SumCard label="Lâmpadas queimadas" value={s.total_lamps ?? 0} color={colors.warning} />
          <SumCard label="Hidráulica" value={s.total_hidraulica ?? 0} color={colors.info} />
          <SumCard label="Elétrica" value={s.total_eletrica ?? 0} color={colors.warning} />
          <SumCard label="Limpeza" value={s.total_limpeza ?? 0} color={colors.success} />
          <SumCard label="Ocorrências abertas" value={s.open_occurrences ?? 0} color={colors.error} />
          <SumCard label="Chaves em posse" value={s.pending_keys ?? 0} color={colors.warning} />
        </View>

        <Section title={`Ocorrências (${(d?.occurrences ?? []).length})`}>
          {(d?.occurrences ?? []).slice(0, 20).map((o: any) => (
            <Text key={o.id} style={styles.row}>
              • {o.title} — {STATUS_LABELS[o.status] ?? o.status}
            </Text>
          ))}
        </Section>

        <Section title={`Chaves (${(d?.keys ?? []).length})`}>
          {(d?.keys ?? []).slice(0, 20).map((k: any) => (
            <Text key={k.id} style={styles.row}>
              • {k.employee_name} — Apto {k.apartment} — {k.returned ? "Devolvida" : "Em posse"}
            </Text>
          ))}
        </Section>

        <Section title={`Piscina (${(d?.pool ?? []).length})`}>
          {(d?.pool ?? []).map((p: any) => (
            <Text key={p.scheduled_date} style={styles.row}>
              • {p.scheduled_date} — {p.attended ?? "Pendente"}
            </Text>
          ))}
        </Section>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
          onPress={generatePDF}
          disabled={generating || !d}
          testID="gen-pdf"
        >
          <Download color={colors.onBrandPrimary} size={18} weight="bold" />
          <Text style={styles.saveTxt}>{generating ? "Gerando..." : "Gerar e compartilhar PDF"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SumCard({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.sumCard}>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.secTitle}>{title}</Text>
      <View style={styles.secBox}>{children}</View>
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
  back: { padding: 6 },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sumCard: {
    width: "47%",
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  sumValue: { fontSize: 24, fontWeight: "900" },
  sumLabel: { fontSize: 12, color: c.muted, marginTop: 2 },
  secTitle: { fontSize: 13, fontWeight: "800", color: c.muted, textTransform: "uppercase", marginBottom: spacing.sm },
  secBox: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  row: { color: c.onSurface, fontSize: 13, paddingVertical: 4 },
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
    backgroundColor: c.brandPrimary,
    minHeight: 56,
    borderRadius: radius.md,
  },
  saveTxt: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 16 },
}));
