"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  getContractWizardDataAction,
  issueContractActionDirect,
} from "@/app/actions/contract";
import type { ContractWizardErrorCode } from "@/app/actions/contract";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { displayEntity, displayPerson } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import { contractWizardVisual } from "./contractWizardVisual";

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

type WizardStep = 0 | 1 | 2;

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

const blockingLoadErrors: ContractWizardErrorCode[] = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "TENANT_CONTEXT_UNAVAILABLE",
  "DATA_LOAD_FAILED",
];

const BIDI_ISOLATE_START = "\u2068";
const BIDI_ISOLATE_END = "\u2069";

function isolateBidi(value: string | number): string {
  return `${BIDI_ISOLATE_START}${String(value)}${BIDI_ISOLATE_END}`;
}

function normalizeNumericInput(value: string): string {
  const arabicIndic = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  const easternArabicIndic = "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9";

  const normalized = Array.from(value)
    .map((character) => {
      const arabicIndex = arabicIndic.indexOf(character);
      if (arabicIndex >= 0) return String(arabicIndex);

      const easternIndex = easternArabicIndic.indexOf(character);
      if (easternIndex >= 0) return String(easternIndex);

      return character;
    })
    .join("")
    .replace(/[\u066c,\s]/g, "")
    .replace(/\u066b/g, ".")
    .replace(/[^0-9.]/g, "");

  const [whole, ...fractionParts] = normalized.split(".");
  return fractionParts.length > 0
    ? `${whole}.${fractionParts.join("")}`
    : whole;
}

function hasUsableProjectLabel(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase();
  return Boolean(
    normalized &&
      normalized !== "not specified" &&
      normalized !== "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f",
  );
}

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
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [amount, setAmount] = useState("");
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] =
    useState<ContractWizardErrorCode | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const direction = lang === "AR" ? "rtl" : "ltr";
  const locale = lang === "AR" ? "ar-SA" : "en-US";
  const displayLocale: DisplayLocale = lang === "AR" ? "ar" : "en";
  const isArabic = lang === "AR";

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    setClients([]);
    setProperties([]);
    setClientId("");
    setPropertyId("");
    setAmount("");
    setCurrentStep(0);
    setErrorCode(null);
    setIsSuccess(false);
    setIsLoadingData(true);

    void getContractWizardDataAction()
      .then((result) => {
        if (!active) return;

        if (result.success) {
          setClients(result.clients);
          setProperties(result.properties);
          setErrorCode(null);
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
  }, [isOpen, loadAttempt]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSubmitting, onClose]);

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
      ...clients.map((client) => {
        const displayedClientName = displayPerson(
          client.name,
          displayLocale,
          {
            route: "/operations/dashboard",
            entityId: client.id,
            fieldName: "clientName",
          },
        );

        const clientTypeLabel = t(
          client.type === "lead"
            ? "contractWizard.clientType.lead"
            : "contractWizard.clientType.contact",
        );

        return {
          value: client.id,
          label: [
            displayedClientName,
            client.phone,
            clientTypeLabel,
          ]
            .map(isolateBidi)
            .join(" · "),
        };
      }),
    ],
    [clients, displayLocale, t],
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
      ...properties.map((property) => {
        const displayedProjectName = property.projectName
          ? displayEntity(property.projectName, "project", displayLocale, {
              route: "/operations/dashboard",
              entityId: property.id,
              fieldName: "projectName",
            })
          : "";

        const unitLabel = `${t("contractWizard.unit")} ${property.unitNumber}`;
        const priceLabel = `${new Intl.NumberFormat(locale).format(
          property.priceSar,
        )} ${t("contractWizard.currency")}`;

        return {
          value: property.id,
          label: [
            ...(hasUsableProjectLabel(displayedProjectName)
              ? [displayedProjectName]
              : []),
            unitLabel,
            priceLabel,
          ]
            .map(isolateBidi)
            .join(" · "),
        };
      }),
    ],
    [displayLocale, locale, properties, t],
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients],
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) ?? null,
    [properties, propertyId],
  );

  const selectedProjectDisplay = useMemo(() => {
    if (!selectedProperty?.projectName) return "";

    const displayed = displayEntity(
      selectedProperty.projectName,
      "project",
      displayLocale,
      {
        route: "/operations/dashboard",
        entityId: selectedProperty.id,
        fieldName: "projectName",
      },
    );

    return hasUsableProjectLabel(displayed) ? displayed : "";
  }, [displayLocale, selectedProperty]);

  const numericAmount = Number(amount);
  const amountIsValid =
    Boolean(amount) && Number.isFinite(numericAmount) && numericAmount > 0;
  const canReview = Boolean(clientId && propertyId && amountIsValid);
  const loadIsBlocked =
    Boolean(errorCode) &&
    blockingLoadErrors.includes(errorCode as ContractWizardErrorCode) &&
    clients.length === 0 &&
    properties.length === 0;

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handlePropertyChange = (nextPropertyId: string) => {
    setPropertyId(nextPropertyId);
    const selected = properties.find(
      (property) => property.id === nextPropertyId,
    );
    setAmount(selected ? String(selected.priceSar) : "");
    setErrorCode(null);
  };

  const goBack = () => {
    setErrorCode(null);
    setCurrentStep((step) => Math.max(0, step - 1) as WizardStep);
  };

  const goNext = () => {
    setErrorCode(null);

    if (currentStep === 0) {
      if (!clientId) {
        setErrorCode("CLIENT_REQUIRED");
        return;
      }

      setCurrentStep(1);
      return;
    }

    if (!propertyId) {
      setErrorCode("PROPERTY_REQUIRED");
      return;
    }

    if (!amountIsValid) {
      setErrorCode("AMOUNT_INVALID");
      return;
    }

    setCurrentStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSuccess(false);

    if (currentStep !== 2 || !canReview) {
      setErrorCode(
        !clientId
          ? "CLIENT_REQUIRED"
          : !propertyId
            ? "PROPERTY_REQUIRED"
            : "AMOUNT_INVALID",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await issueContractActionDirect({
        clientId,
        propertyId,
        amount: numericAmount,
      });

      if (!result.success) {
        setErrorCode(result.code);
        return;
      }

      setIsSuccess(true);
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

  const steps = [
    { key: "client", label: t("contractWizard.step.client") },
    { key: "property", label: t("contractWizard.step.property") },
    { key: "review", label: t("contractWizard.step.review") },
  ] as const;

  const NextIcon = isArabic ? ChevronLeft : ChevronRight;
  const BackIcon = isArabic ? ChevronRight : ChevronLeft;

  return (
    <div
      className={contractWizardVisual.overlay}
      dir={direction}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-wizard-title"
        aria-describedby="contract-wizard-description"
        tabIndex={-1}
        className={contractWizardVisual.dialog}
      >
        <header className={contractWizardVisual.header}>
          <div className="flex min-w-0 items-start gap-3">
            <span className={contractWizardVisual.iconTile}>
              <FileSignature size={21} strokeWidth={2.2} aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <h2
                id="contract-wizard-title"
                className={contractWizardVisual.title}
              >
                {t("contractWizard.title")}
              </h2>
              <p
                id="contract-wizard-description"
                className={contractWizardVisual.subtitle}
              >
                {t("contractWizard.subtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className={contractWizardVisual.closeButton}
            aria-label={t("contractWizard.close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <ol
          className={contractWizardVisual.stepList}
          aria-label={t("contractWizard.stepperLabel")}
        >
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <li
                key={step.key}
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  contractWizardVisual.step,
                  isCurrent
                    ? contractWizardVisual.stepCurrent
                    : isComplete
                      ? contractWizardVisual.stepComplete
                      : contractWizardVisual.stepPending,
                ].join(" ")}
              >
                <span className={contractWizardVisual.stepNumber}>
                  {isComplete ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate text-xs font-bold sm:text-sm">
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        {errorCode && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-semibold text-red-700 dark:text-red-300"
          >
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{t(contractWizardErrorKey(errorCode))}</span>
          </div>
        )}

        {isSuccess ? (
          <div
            role="status"
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 size={30} aria-hidden="true" />
            <p className="text-sm font-bold">{t("contractWizard.success")}</p>
          </div>
        ) : isLoadingData ? (
          <div
            className="flex min-h-56 flex-col items-center justify-center gap-3"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={30}
              className="animate-spin text-[var(--nc-accent)]"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--nc-text-secondary)]">
              {t("contractWizard.loadingData")}
            </p>
          </div>
        ) : loadIsBlocked ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <AlertTriangle
              size={28}
              className="text-red-600 dark:text-red-300"
              aria-hidden="true"
            />
            <p className="max-w-md text-sm text-[var(--nc-text-secondary)]">
              {t(contractWizardErrorKey(errorCode as ContractWizardErrorCode))}
            </p>

            {errorCode === "DATA_LOAD_FAILED" ||
            errorCode === "TENANT_CONTEXT_UNAVAILABLE" ? (
              <button
                type="button"
                className={contractWizardVisual.secondaryButton}
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                <RotateCcw size={16} aria-hidden="true" />
                {t("contractWizard.retryData")}
              </button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {currentStep === 0 && (
              <div className="space-y-2">
                <label className={contractWizardVisual.label}>
                  {t("contractWizard.clientLabel")}
                </label>
                <SettingsSelect
                  className="w-full"
                  placement="bottom"
                  value={clientId}
                  onChange={(value) => {
                    setClientId(value);
                    setErrorCode(null);
                  }}
                  disabled={isSubmitting}
                  options={clientOptions}
                  aria-label={t("contractWizard.clientLabel")}
                />
              </div>
            )}

            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <label className={contractWizardVisual.label}>
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
                  <label
                    htmlFor="contract-wizard-amount"
                    className={contractWizardVisual.label}
                  >
                    {t("contractWizard.amountLabel")}
                  </label>

                  <div className="relative">
                    <input
                      id="contract-wizard-amount"
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en-US"
                      autoComplete="off"
                      placeholder={t("contractWizard.amountPlaceholder")}
                      value={amount}
                      onChange={(event) => {
                        setAmount(normalizeNumericInput(event.target.value));
                        setErrorCode(null);
                      }}
                      disabled={isSubmitting}
                      className={`${contractWizardVisual.field} ps-16 font-mono tabular-nums`}
                    />
                    <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--nc-text-dim)]">
                      {t("contractWizard.currency")}
                    </span>
                  </div>

                  <p className={contractWizardVisual.helper}>
                    {t("contractWizard.amountHint")}
                  </p>
                </div>
              </>
            )}

            {currentStep === 2 && selectedClient && selectedProperty && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-[var(--nc-text-primary)]">
                    {t("contractWizard.reviewTitle")}
                  </h3>
                  <p className={contractWizardVisual.subtitle}>
                    {t("contractWizard.reviewDescription")}
                  </p>
                </div>

                <dl className={contractWizardVisual.reviewPanel}>
                  <div className="flex flex-col gap-1 border-b border-[var(--nc-glass-border)] py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t("contractWizard.reviewClient")}
                    </dt>
                    <dd className="text-sm font-bold text-[var(--nc-text-primary)]">
                      <bdi dir="auto">
                        {displayPerson(selectedClient.name, displayLocale, {
                          route: "/operations/dashboard",
                          entityId: selectedClient.id,
                          fieldName: "clientName",
                        })}
                      </bdi>
                    </dd>
                  </div>

                  <div className="flex flex-col gap-1 border-b border-[var(--nc-glass-border)] py-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t("contractWizard.reviewProperty")}
                    </dt>
                    <dd className="text-sm font-bold text-[var(--nc-text-primary)]">
                      <bdi dir="auto">
                        {[
                          ...(selectedProjectDisplay
                            ? [selectedProjectDisplay]
                            : []),
                          `${t("contractWizard.unit")} ${selectedProperty.unitNumber}`,
                        ].join(" — ")}
                      </bdi>
                    </dd>
                  </div>

                  <div className="flex flex-col gap-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t("contractWizard.reviewAmount")}
                    </dt>
                    <dd className="text-lg font-black text-[var(--nc-text-primary)]">
                      <bdi dir="ltr" className="font-mono tabular-nums">
                        {new Intl.NumberFormat(locale).format(numericAmount)}{" "}
                        {t("contractWizard.currency")}
                      </bdi>
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--nc-glass-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {currentStep === 0 ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className={contractWizardVisual.secondaryButton}
                  >
                    {t("contractWizard.cancel")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isSubmitting}
                    className={contractWizardVisual.secondaryButton}
                  >
                    <BackIcon size={16} aria-hidden="true" />
                    {t("contractWizard.back")}
                  </button>
                )}
              </div>

              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={
                    isSubmitting ||
                    (currentStep === 0 ? !clientId : !canReview)
                  }
                  className={contractWizardVisual.primaryButton}
                >
                  {t("contractWizard.next")}
                  <NextIcon size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !canReview}
                  className={contractWizardVisual.primaryButton}
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
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
