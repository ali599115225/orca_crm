"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";

type PropertyUnit = {
  id: string;
  unitNumber: string;
  projectName: string;
  city: string | null;
  district: string | null;
  status: string;
};

type RentFlexUnitConfig = {
  id: string;
  unitId: string;
  externalRnplEnabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function RentFlexPropertyAvailabilityPanel({
  canWrite,
}: {
  canWrite: boolean;
}) {
  const { lang } = useApp();
  const ar = lang !== "EN";
  const t = (arabic: string, english: string) => (ar ? arabic : english);

  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [config, setConfig] = useState<RentFlexUnitConfig | null>(null);
  const [featureAvailable, setFeatureAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadUnitConfig = useCallback(async (unitId: string) => {
    if (!unitId) return;
    setError("");
    try {
      const response = await fetch(`/api/v1/rent-flex/units/${unitId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 404) {
        setFeatureAvailable(false);
        setConfig(null);
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setFeatureAvailable(false);
        setConfig(null);
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "RENT_FLEX_CONFIG_LOAD_FAILED");
      setFeatureAvailable(true);
      setConfig(payload?.data ?? null);
    } catch {
      setFeatureAvailable(true);
      setConfig(null);
      setError(t("تعذر قراءة إعداد الدفع المرن لهذه الوحدة.", "Unable to load Rent Flex availability for this unit."));
    }
  }, [ar]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/properties", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error("PROPERTY_LOAD_FAILED");
      const nextUnits = (Array.isArray(payload.data) ? payload.data : []) as PropertyUnit[];
      setUnits(nextUnits);
      const nextId =
        selectedUnitId && nextUnits.some((unit) => unit.id === selectedUnitId)
          ? selectedUnitId
          : nextUnits[0]?.id || "";
      setSelectedUnitId(nextId);
      if (nextId) await loadUnitConfig(nextId);
      else setFeatureAvailable(null);
    } catch {
      setUnits([]);
      setError(t("تعذر تحميل الوحدات العقارية.", "Unable to load property units."));
    } finally {
      setLoading(false);
    }
  }, [ar, loadUnitConfig, selectedUnitId]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedUnitId || loading) return;
    void loadUnitConfig(selectedUnitId);
  }, [selectedUnitId]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  async function toggleAvailability() {
    if (!selectedUnitId || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const nextEnabled = !(config?.externalRnplEnabled && config.status === "ACTIVE");
    try {
      const response = await fetch(`/api/v1/rent-flex/units/${selectedUnitId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalRnplEnabled: nextEnabled,
          status: nextEnabled ? "ACTIVE" : "DISABLED",
        }),
      });
      if (response.status === 404) {
        throw new Error("WRITE_NOT_READY");
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "UPDATE_FAILED");
      setConfig(payload?.data ?? null);
      setNotice(
        nextEnabled
          ? t("تمت إتاحة خيار 12 دفعة على الوحدة.", "The 12-payment option is now available on this unit.")
          : t("تم إيقاف إتاحة الدفع المرن على الوحدة.", "Rent Flex availability was disabled for this unit."),
      );
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        code === "WRITE_NOT_READY"
          ? t("تعديل إعداد الدفع المرن غير مفعّل تشغيليًا بعد.", "Rent Flex configuration writes are not operationally enabled yet.")
          : t("تعذر تحديث إتاحة الدفع المرن.", "Unable to update Rent Flex availability."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (featureAvailable === false) return null;
  if (loading && featureAvailable === null) return null;
  if (!units.length && !error) return null;

  const enabled = Boolean(config?.externalRnplEnabled && config.status === "ACTIVE");

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="orca-container mt-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4"
      aria-label={t("إتاحة الدفع المرن للعقار", "Property Rent Flex availability")}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
            <CircleDollarSign size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">Rent Flex 12</strong>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                  enabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-[var(--nc-border)] text-[var(--nc-text-secondary)]"
                }`}
              >
                {enabled
                  ? t("الدفع المرن متاح", "Flexible payment available")
                  : t("غير مفعّل على الوحدة", "Not enabled on this unit")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--nc-text-secondary)]">
              {t(
                "الإتاحة تعني أن الخيار يمكن عرضه للمستأجر فقط، ولا تعني الأهلية أو القبول لدى أي مزود.",
                "Availability only means the option may be shown to a tenant; it does not mean provider eligibility or approval.",
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-[220px]">
            <SettingsSelect
              value={selectedUnitId}
              onChange={setSelectedUnitId}
              options={units.map((unit) => ({
                value: unit.id,
                label: `${unit.unitNumber} · ${unit.projectName}`,
              }))}
              placeholder={t("اختر الوحدة", "Choose unit")}
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="nc-btn nc-btn-ghost min-h-11 justify-center"
            aria-label={t("تحديث", "Refresh")}
          >
            <RefreshCw size={15} />
          </button>
          {canWrite && selectedUnit && (
            <button
              type="button"
              onClick={() => void toggleAvailability()}
              disabled={busy}
              className="nc-btn nc-btn-ghost min-h-11 justify-center"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {enabled
                ? t("إيقاف الإتاحة", "Disable")
                : t("إتاحة 12 دفعة", "Enable 12 payments")}
            </button>
          )}
        </div>
      </div>

      {selectedUnit && (
        <p className="mt-3 text-xs text-[var(--nc-text-dim)]">
          {selectedUnit.unitNumber} · {selectedUnit.projectName}
          {[selectedUnit.city, selectedUnit.district].filter(Boolean).length
            ? ` · ${[selectedUnit.city, selectedUnit.district].filter(Boolean).join(" / ")}`
            : ""}
        </p>
      )}
      {(notice || error) && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {error || notice}
        </div>
      )}
    </section>
  );
}
