"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  getContractWizardDataAction,
  issueContractActionDirect,
} from "@/app/actions/contract";
import type { ContractWizardErrorCode } from "@/app/actions/contract";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";

interface Client {
  id: string;
  name: string;
  phone: string;
  type: "lead" | "contact";
}

interface Property {
  id: string;
  unitNumber: string;
  priceSar: number;
  projectName: string;
}

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const errorTranslationKey: Record<ContractWizardErrorCode, string> = {
  AUTH_REQUIRED: "contractWizard.error.authRequired",
  FORBIDDEN: "contractWizard.error.forbidden",
  TENANT_CONTEXT_UNAVAILABLE: "contractWizard.error.tenantUnavailable",
  CLIENT_REQUIRED: "contractWizard.error.clientRequired",
  PROPERTY_REQUIRED: "contractWizard.error.propertyRequired",
  AMOUNT_INVALID: "contractWizard.error.amountInvalid",
  DATA_LOAD_FAILED: "contractWizard.error.dataLoad",
  CONTRACT_ISSUE_FAILED: "contractWizard.error.issueFailed",
};

export function contractWizardErrorKey(
  code: ContractWizardErrorCode,
): string {
  return errorTranslationKey[code] || "contractWizard.error.issueFailed";
}

export default function ContractWizard({
  isOpen,
  onClose,
  onSuccess,
}: ContractWizardProps) {
  const { lang, t } = useApp();
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] =
    useState<ContractWizardErrorCode | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const direction = lang === "AR" ? "rtl" : "ltr";
  const locale = lang === "AR" ? "ar-SA" : "en-US";

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    setClients([]);
    setProperties([]);
    setClientId("");
    setPropertyId("");
    setAmount("");
    setErrorCode(null);
    setIsSuccess(false);
    setIsLoadingData(true);

    void getContractWizardDataAction()
      .then((result) => {
        if (!active) return;

        if (result.success) {
          setClients(result.clients);
          setProperties(result.properties);
          return;
        }

        setErrorCode(result.code);
      })
      .catch(() => {
        if (active) setErrorCode("DATA_LOAD_FAILED");
      })
      .finally(() => {
        if (active) setIsLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const clientOptions = useMemo(
    () => [
      {
        value: "",
        label:
          clients.length === 0
            ? t("contractWizard.clientEmpty")
            : t("contractWizard.clientPlaceholder"),
        disabled: clients.length === 0,
      },
      ...clients.map((client) => ({
        value: client.id,
        label: `${client.name} (${client.phone}) — ${t(
          client.type === "lead"
            ? "contractWizard.clientType.lead"
            : "contractWizard.clientType.contact",
        )}`,
      })),
    ],
    [clients, t],
  );

  const propertyOptions = useMemo(
    () => [
      {
        value: "",
        label:
          properties.length === 0
            ? t("contractWizard.propertyEmpty")
            : t("contractWizard.propertyPlaceholder"),
        disabled: properties.length === 0,
      },
      ...properties.map((property) => ({
        value: property.id,
        label: `${property.projectName || t("contractWizard.generalProject")} — ${t(
          "contractWizard.unit",
        )} ${property.unitNumber} (${new Intl.NumberFormat(locale).format(
          property.priceSar,
        )} ${t("contractWizard.currency")})`,
      })),
    ],
    [locale, properties, t],
  );

  const handlePropertyChange = (nextPropertyId: string) => {
    setPropertyId(nextPropertyId);
    const selected = properties.find(
      (property) => property.id === nextPropertyId,
    );
    setAmount(selected ? String(selected.priceSar) : "");
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSuccess(false);

    if (!clientId) {
      setErrorCode("CLIENT_REQUIRED");
      return;
    }

    if (!propertyId) {
      setErrorCode("PROPERTY_REQUIRED");
      return;
    }

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setErrorCode("AMOUNT_INVALID");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await issueContractActionDirect({
        clientId,
        propertyId,
        amount: Number(amount),
      });

      if (!result.success) {
        setErrorCode(result.code);
        return;
      }

      setIsSuccess(true);
      setClientId("");
      setPropertyId("");
      setAmount("");
      onSuccess?.();

      window.setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setErrorCode("CONTRACT_ISSUE_FAILED");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepIndex = !clientId ? 0 : !propertyId ? 1 : 2;
  const steps = [
    {
      key: "client",
      label: t("contractWizard.step.client"),
      done: Boolean(clientId),
    },
    {
      key: "property",
      label: t("contractWizard.step.property"),
      done: Boolean(propertyId),
    },
    {
      key: "amount",
      label: t("contractWizard.step.amount"),
      done: Boolean(amount) && Number(amount) > 0,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182D]/80 p-4 backdrop-blur-md"
      dir={direction}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
        aria-label={t("contractWizard.close")}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-wizard-title"
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#0A1F3A]/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0B1729]"
      >
        <header className="mb-5 flex items-center justify-between border-b border-[#0A1F3A]/10 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9AD55]/10 text-[#D9AD55]">
              <FileSignature size={21} strokeWidth={2.2} aria-hidden="true" />
            </span>

            <div>
              <h3
                id="contract-wizard-title"
                className="text-base font-extrabold text-[#0A1F3A] dark:text-white"
              >
                {t("contractWizard.title")}
              </h3>
              <p className="mt-1 text-xs text-[#0A1F3A]/65 dark:text-white/65">
                {t("contractWizard.subtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#0A1F3A]/10 text-[#0A1F3A]/65 transition-colors hover:border-[#D9AD55]/50 hover:bg-[#D9AD55]/10 hover:text-[#0A1F3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] disabled:opacity-50 dark:border-white/10 dark:text-white/65 dark:hover:text-white"
            aria-label={t("contractWizard.close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="mb-5 flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                    step.done
                      ? "border-[#D9AD55] bg-[#D9AD55] text-[#07182D]"
                      : index === stepIndex
                        ? "border-[#D9AD55] bg-[#D9AD55]/10 text-[#D9AD55]"
                        : "border-[#0A1F3A]/15 text-[#0A1F3A]/45 dark:border-white/15 dark:text-white/45",
                  ].join(" ")}
                >
                  {step.done ? "✓" : index + 1}
                </span>

                <span
                  className={[
                    "text-xs font-bold",
                    index === stepIndex
                      ? "text-[#D9AD55]"
                      : step.done
                        ? "text-[#0A1F3A] dark:text-white"
                        : "text-[#0A1F3A]/50 dark:text-white/50",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <span
                  className={[
                    "mx-3 h-px flex-1",
                    index < stepIndex
                      ? "bg-[#D9AD55]"
                      : "bg-[#0A1F3A]/10 dark:bg-white/10",
                  ].join(" ")}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {errorCode && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300"
          >
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{t(contractWizardErrorKey(errorCode))}</span>
          </div>
        )}

        {isSuccess && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{t("contractWizard.success")}</span>
          </div>
        )}

        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <LoaderCircle
              size={30}
              className="animate-spin text-[#D9AD55]"
              aria-hidden="true"
            />
            <p className="text-sm text-[#0A1F3A]/65 dark:text-white/65">
              {t("contractWizard.loadingData")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A1F3A]/70 dark:text-white/70">
                {t("contractWizard.clientLabel")}
              </label>
              <SettingsSelect
                className="w-full"
                placement="bottom"
                value={clientId}
                onChange={setClientId}
                disabled={isSubmitting}
                options={clientOptions}
                aria-label={t("contractWizard.clientLabel")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A1F3A]/70 dark:text-white/70">
                {t("contractWizard.propertyLabel")}
              </label>
              <SettingsSelect
                className="w-full"
                placement="bottom"
                value={propertyId}
                onChange={handlePropertyChange}
                disabled={isSubmitting}
                options={propertyOptions}
                aria-label={t("contractWizard.propertyLabel")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A1F3A]/70 dark:text-white/70">
                {t("contractWizard.amountLabel")}
              </label>

              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={t("contractWizard.amountPlaceholder")}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-[#0A1F3A]/10 bg-[#0A1F3A]/[0.025] px-4 py-3 ps-16 text-start text-sm text-[#0A1F3A] outline-none transition-colors focus:border-[#D9AD55] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white"
                />
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0A1F3A]/50 dark:text-white/50">
                  {t("contractWizard.currency")}
                </span>
              </div>

              <p className="text-xs leading-5 text-[#0A1F3A]/55 dark:text-white/55">
                {t("contractWizard.amountHint")}
              </p>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#D9AD55] bg-[#D9AD55] px-5 py-3 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#0B1729]"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    <span>{t("contractWizard.submitting")}</span>
                  </>
                ) : (
                  <>
                    <FileSignature size={17} aria-hidden="true" />
                    <span>{t("contractWizard.submit")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl border border-[#0A1F3A]/10 px-5 py-3 text-sm font-bold text-[#0A1F3A]/70 transition-colors hover:border-[#D9AD55]/50 hover:bg-[#D9AD55]/10 hover:text-[#0A1F3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:text-white"
              >
                {t("contractWizard.cancel")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
