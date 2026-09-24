"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  RefreshCw,
  Search,
  SendHorizontal,
  UsersRound,
  X,
} from "lucide-react";

import { useApp } from "@/app/context/AppContext";
import {
  getContractWizardDataAction,
  issueContractActionDirect,
} from "@/app/actions/contract";

import type {
  DashboardCapabilities,
  DashboardPipelineStageKey,
  DashboardReadModel,
} from "../model";

import styles from "./cleanroom-dashboard.module.css";

type Props = {
  user: { name: string | null };
  model: DashboardReadModel;
  capabilities: DashboardCapabilities;
  preview?: boolean;
};

type ContractClient = {
  id: string;
  name: string;
  phone: string;
  type: "lead" | "contact";
};

type ContractProperty = {
  id: string;
  unitNumber: string;
  priceSar: number;
  projectName: string;
};

const stageLinks: Record<DashboardPipelineStageKey, string> = {
  opportunity: "/operations/leads",
  tour: "/operations/tours",
  offer: "/operations/offers",
  contract: "/operations/sales",
  closed: "/operations/sales",
};

const stageIcons = {
  opportunity: UsersRound,
  tour: CalendarCheck2,
  offer: SendHorizontal,
  contract: FileCheck2,
  closed: CheckCircle2,
};

export default function CleanroomDashboard({
  user,
  model,
  capabilities,
  preview = false,
}: Props) {
  const { lang } = useApp();
  const router = useRouter();

  const ar = lang === "AR";
  const locale = ar ? "ar-SA" : "en-US";

  const pipelineData =
    model.pipeline.status === "ready" ? model.pipeline.data : null;

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");

  const [contractOpen, setContractOpen] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractSubmitting, setContractSubmitting] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractSuccess, setContractSuccess] = useState("");

  const [clients, setClients] = useState<ContractClient[]>([]);
  const [properties, setProperties] = useState<ContractProperty[]>([]);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [amount, setAmount] = useState("");

  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  const selectedClient =
    clients.find((client) => client.id === clientId) ?? null;

  const selectedProperty =
    properties.find((property) => property.id === propertyId) ?? null;

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      `${client.name} ${client.phone} ${client.type}`
        .toLowerCase()
        .includes(query),
    );
  }, [clientSearch, clients]);

  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();
    if (!query) return properties;

    return properties.filter((property) =>
      `${property.projectName} ${property.unitNumber} ${property.priceSar}`
        .toLowerCase()
        .includes(query),
    );
  }, [properties, propertySearch]);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Riyadh",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(new Date(model.generatedAt)),
    [locale, model.generatedAt],
  );

  const activeStages =
    pipelineData?.stages.filter((stage) => stage.count > 0).length ?? 0;

  const closedCount =
    pipelineData?.stages.find((stage) => stage.key === "closed")?.count ?? 0;

  const closeRate =
    pipelineData && pipelineData.total > 0
      ? Math.round((closedCount / pipelineData.total) * 100)
      : 0;

  const copy = {
    eyebrow: ar ? "لوحة القيادة التشغيلية" : "Operational command dashboard",
    welcome: ar ? "مرحبًا" : "Welcome",
    fallbackUser: ar ? "مستخدم ORCA" : "ORCA User",
    description: ar
      ? "ملخص موثوق لحركة المبيعات والعمليات اليومية."
      : "A trusted snapshot of sales movement and daily operations.",
    today: ar ? "اليوم" : "Today",
    issueContract: ar ? "إصدار عقد جديد" : "Issue new contract",
    askOrca: ar ? "اسأل ORCA" : "Ask ORCA",
    refresh: ar ? "تحديث البيانات" : "Refresh data",
    pipeline: ar ? "مسار الصفقات" : "Deal pipeline",
    pipelineDescription: ar
      ? "تقدم الصفقات من الفرصة حتى الإغلاق اعتمادًا على السجلات الفعلية."
      : "Deal progress from opportunity through closure using actual records.",
    pipelineTotal: ar ? "إجمالي المسار" : "Pipeline total",
    activeStages: ar ? "المراحل النشطة" : "Active stages",
    closeRate: ar ? "نسبة الإغلاق" : "Close rate",
    live: ar ? "مباشر" : "Live",
    unavailable: ar ? "البيانات غير متاحة حالياً." : "Data currently unavailable.",
  };

  const stageLabels: Record<DashboardPipelineStageKey, string> = ar
    ? {
        opportunity: "فرصة",
        tour: "جولة",
        offer: "عرض",
        contract: "عقد",
        closed: "مغلق",
      }
    : {
        opportunity: "Opportunity",
        tour: "Tour",
        offer: "Offer",
        contract: "Contract",
        closed: "Closed",
      };

  function buildAssistantAnswer(question: string): string {
    const q = question.trim().toLowerCase();

    if (
      q.includes("مسار") ||
      q.includes("صفق") ||
      q.includes("pipeline") ||
      q.includes("deal")
    ) {
      if (!pipelineData) return copy.unavailable;

      return pipelineData.stages
        .map((stage) => `${stageLabels[stage.key]}: ${stage.count}`)
        .join(" · ");
    }

    return ar
      ? `إجمالي مسار الصفقات: ${pipelineData?.total ?? "—"} · المراحل النشطة: ${activeStages}/5 · نسبة الإغلاق: ${closeRate}%`
      : `Pipeline total: ${pipelineData?.total ?? "—"} · Active stages: ${activeStages}/5 · Close rate: ${closeRate}%`;
  }

  function askOrca(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = assistantInput.trim();
    if (!value) return;

    setAssistantAnswer(buildAssistantAnswer(value));
  }

  async function openContract() {
    setContractError("");
    setContractSuccess("");
    setClientId("");
    setPropertyId("");
    setAmount("");
    setClientSearch("");
    setPropertySearch("");
    setClientPickerOpen(false);
    setPropertyPickerOpen(false);
    setContractOpen(true);

    if (preview) {
      setClients([
        {
          id: "preview-client",
          name: "عميل معاينة",
          phone: "05xxxxxxxx",
          type: "lead",
        },
      ]);

      setProperties([
        {
          id: "preview-property",
          unitNumber: "A-101",
          priceSar: 850000,
          projectName: "مشروع معاينة",
        },
      ]);

      return;
    }

    setContractLoading(true);

    try {
      const result = await getContractWizardDataAction();

      if (!result.success) {
        setContractError(
          ar ? "تعذر تحميل بيانات إصدار العقد." : "Contract data could not be loaded.",
        );
        return;
      }

      setClients(result.clients);
      setProperties(result.properties);
    } catch {
      setContractError(
        ar ? "تعذر تحميل بيانات إصدار العقد." : "Contract data could not be loaded.",
      );
    } finally {
      setContractLoading(false);
    }
  }

  function selectProperty(nextId: string) {
    setPropertyId(nextId);

    const selected = properties.find(
      (property) => property.id === nextId,
    );

    setAmount(selected ? String(selected.priceSar) : "");
  }

  async function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (preview) {
      setContractSuccess(
        ar
          ? "هذه معاينة بصرية فقط — لم يتم إنشاء عقد."
          : "Visual preview only — no contract was created.",
      );
      return;
    }

    if (!clientId || !propertyId || Number(amount) <= 0) {
      setContractError(
        ar ? "أكمل بيانات العقد أولاً." : "Complete the contract data first.",
      );
      return;
    }

    setContractSubmitting(true);
    setContractError("");
    setContractSuccess("");

    try {
      const result = await issueContractActionDirect({
        clientId,
        propertyId,
        amount: Number(amount),
      });

      if (!result.success) {
        setContractError(
          ar ? "تعذر إصدار العقد." : "Contract could not be issued.",
        );
        return;
      }

      setContractSuccess(
        ar ? "تم إصدار العقد بنجاح." : "Contract issued successfully.",
      );

      router.refresh();
    } catch {
      setContractError(
        ar ? "تعذر إصدار العقد." : "Contract could not be issued.",
      );
    } finally {
      setContractSubmitting(false);
    }
  }

  return (
    <main className={styles.root} data-dashboard-cleanroom>
      <section className={styles.titleCard}>
        <div className={styles.titleCopy}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>

          <h1>
            {copy.welcome}{" "}
            <bdi dir="auto">{user.name || copy.fallbackUser}</bdi>
          </h1>

          <p>{copy.description}</p>
        </div>

        <div className={styles.titleActions}>
          <div className={styles.dateCard}>
            <CalendarDays size={17} />
            <span>{copy.today}</span>
            <strong>{today}</strong>
          </div>

          {(capabilities.canIssueContract || preview) && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openContract}
            >
              <FilePlus2 size={17} />
              {copy.issueContract}
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setAssistantOpen(true)}
          >
            <Bot size={17} />
            {copy.askOrca}
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => router.refresh()}
            title={copy.refresh}
            aria-label={copy.refresh}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </section>

      <section className={styles.pipelineCard}>
        <header className={styles.pipelineHeader}>
          <div>
            <div className={styles.titleLine}>
              <h2>{copy.pipeline}</h2>
              <span className={styles.liveBadge}>{copy.live}</span>
            </div>

            <p>{copy.pipelineDescription}</p>
          </div>

          {pipelineData && (
            <div className={styles.pipelineTotal}>
              <span>{copy.pipelineTotal}</span>
              <strong>{pipelineData.total}</strong>
            </div>
          )}
        </header>

        {!pipelineData ? (
          <div className={styles.errorState}>
            <AlertTriangle size={18} />
            {copy.unavailable}
          </div>
        ) : (
          <>
            <div className={styles.stageTrack}>
              <span className={styles.stageLine} aria-hidden="true" />

              {pipelineData.stages.map((stage) => {
                const Icon = stageIcons[stage.key];

                const percentage =
                  pipelineData.total > 0
                    ? Math.round((stage.count / pipelineData.total) * 100)
                    : 0;

                return (
                  <Link
                    href={stageLinks[stage.key]}
                    className={styles.stage}
                    key={stage.key}
                  >
                    <span className={styles.stageLabel}>
                      {stageLabels[stage.key]}
                    </span>

                    <span className={styles.stageIcon}>
                      <Icon size={18} />
                    </span>

                    <strong>{stage.count}</strong>
                    <small>{percentage}%</small>
                  </Link>
                );
              })}
            </div>

            <div className={styles.pipelineSummary}>
              <span>
                {copy.activeStages}
                <strong>{activeStages}/5</strong>
              </span>

              <span>
                {copy.closeRate}
                <strong>{closeRate}%</strong>
              </span>
            </div>
          </>
        )}
      </section>

      {assistantOpen && (
        <div className={styles.modalLayer}>
          <button
            className={styles.modalBackdrop}
            onClick={() => setAssistantOpen(false)}
            aria-label={ar ? "إغلاق" : "Close"}
          />

          <section className={styles.modal}>
            <header className={styles.modalHeader}>
              <div>
                <span>{ar ? "المساعد التشغيلي" : "Operational assistant"}</span>
                <h2>{copy.askOrca}</h2>
              </div>

              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setAssistantOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <p className={styles.modalDescription}>
              {ar
                ? "اسأل عن مسار الصفقات أو حالته الحالية."
                : "Ask about the deal pipeline and its current status."}
            </p>

            {assistantAnswer && (
              <div className={styles.answerBox}>{assistantAnswer}</div>
            )}

            <form className={styles.askForm} onSubmit={askOrca}>
              <input
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder={ar ? "اكتب سؤالك هنا..." : "Type your question..."}
              />

              <button type="submit" className={styles.primaryButton}>
                {ar ? "إرسال" : "Send"}
              </button>
            </form>
          </section>
        </div>
      )}

      {contractOpen && (
        <div className={styles.modalLayer}>
          <button
            className={styles.modalBackdrop}
            onClick={() => setContractOpen(false)}
            aria-label={ar ? "إغلاق" : "Close"}
          />

          <section className={styles.contractModal}>
            <header className={styles.modalHeader}>
              <div>
                <span>{ar ? "العقود" : "Contracts"}</span>
                <h2>{copy.issueContract}</h2>
              </div>

              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setContractOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            {contractLoading ? (
              <div className={styles.compactEmpty}>
                {ar ? "جارٍ تحميل البيانات..." : "Loading data..."}
              </div>
            ) : (
              <form className={styles.contractForm} onSubmit={submitContract}>
                <div className={styles.pickerField}>
                  <span className={styles.fieldLabel}>
                    {ar ? "العميل" : "Client"}
                  </span>

                  <button
                    type="button"
                    className={`${styles.pickerTrigger} ${
                      clientPickerOpen ? styles.pickerTriggerOpen : ""
                    }`}
                    onClick={() => {
                      setClientPickerOpen((current) => !current);
                      setPropertyPickerOpen(false);
                    }}
                    aria-expanded={clientPickerOpen}
                  >
                    <span>
                      {selectedClient
                        ? `${selectedClient.name} · ${selectedClient.phone}`
                        : ar
                          ? "اختر العميل"
                          : "Select client"}
                    </span>

                    <span className={styles.pickerChevron}>⌄</span>
                  </button>

                  {clientPickerOpen && (
                    <div className={styles.pickerPanel}>
                      <div className={styles.pickerSearch}>
                        <Search size={15} aria-hidden="true" />

                        <input
                          value={clientSearch}
                          onChange={(event) => setClientSearch(event.target.value)}
                          placeholder={
                            ar
                              ? "ابحث بالاسم أو رقم الجوال..."
                              : "Search name or phone..."
                          }
                          autoFocus
                        />
                      </div>

                      <div className={styles.pickerTableHead}>
                        <span>{ar ? "العميل" : "Client"}</span>
                        <span>{ar ? "الجوال" : "Phone"}</span>
                        <span>{ar ? "النوع" : "Type"}</span>
                      </div>

                      <div className={styles.pickerRows}>
                        {filteredClients.length ? (
                          filteredClients.map((client) => (
                            <button
                              type="button"
                              key={client.id}
                              className={`${styles.pickerRow} ${
                                client.id === clientId
                                  ? styles.pickerRowSelected
                                  : ""
                              }`}
                              onClick={() => {
                                setClientId(client.id);
                                setClientPickerOpen(false);
                              }}
                            >
                              <strong>{client.name}</strong>
                              <span dir="ltr">{client.phone}</span>
                              <span>
                                {client.type === "lead"
                                  ? ar
                                    ? "عميل محتمل"
                                    : "Lead"
                                  : ar
                                    ? "جهة اتصال"
                                    : "Contact"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className={styles.pickerEmpty}>
                            {ar ? "لا توجد نتائج مطابقة." : "No matching results."}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.pickerField}>
                  <span className={styles.fieldLabel}>
                    {ar ? "الوحدة العقارية" : "Property"}
                  </span>

                  <button
                    type="button"
                    className={`${styles.pickerTrigger} ${
                      propertyPickerOpen ? styles.pickerTriggerOpen : ""
                    }`}
                    onClick={() => {
                      setPropertyPickerOpen((current) => !current);
                      setClientPickerOpen(false);
                    }}
                    aria-expanded={propertyPickerOpen}
                  >
                    <span>
                      {selectedProperty
                        ? `${
                            selectedProperty.projectName
                              ? `${selectedProperty.projectName} · `
                              : ""
                          }${selectedProperty.unitNumber}`
                        : ar
                          ? "اختر الوحدة"
                          : "Select property"}
                    </span>

                    <span className={styles.pickerChevron}>⌄</span>
                  </button>

                  {propertyPickerOpen && (
                    <div className={styles.pickerPanel}>
                      <div className={styles.pickerSearch}>
                        <Search size={15} aria-hidden="true" />

                        <input
                          value={propertySearch}
                          onChange={(event) =>
                            setPropertySearch(event.target.value)
                          }
                          placeholder={
                            ar
                              ? "ابحث بالمشروع أو رقم الوحدة..."
                              : "Search project or unit..."
                          }
                          autoFocus
                        />
                      </div>

                      <div className={`${styles.pickerTableHead} ${styles.propertyColumns}`}>
                        <span>{ar ? "المشروع" : "Project"}</span>
                        <span>{ar ? "الوحدة" : "Unit"}</span>
                        <span>{ar ? "السعر" : "Price"}</span>
                      </div>

                      <div className={styles.pickerRows}>
                        {filteredProperties.length ? (
                          filteredProperties.map((property) => (
                            <button
                              type="button"
                              key={property.id}
                              className={`${styles.pickerRow} ${styles.propertyColumns} ${
                                property.id === propertyId
                                  ? styles.pickerRowSelected
                                  : ""
                              }`}
                              onClick={() => {
                                selectProperty(property.id);
                                setPropertyPickerOpen(false);
                              }}
                            >
                              <strong>
                                {property.projectName ||
                                  (ar ? "غير محدد" : "Unspecified")}
                              </strong>

                              <span>{property.unitNumber}</span>

                              <span>
                                {new Intl.NumberFormat(locale).format(
                                  property.priceSar,
                                )}{" "}
                                {ar ? "ر.س" : "SAR"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className={styles.pickerEmpty}>
                            {ar ? "لا توجد نتائج مطابقة." : "No matching results."}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <label className={styles.amountField}>
                  <span>{ar ? "قيمة العقد" : "Contract amount"}</span>

                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={ar ? "أدخل قيمة العقد" : "Enter contract amount"}
                  />
                </label>

                {contractError && (
                  <div className={styles.formError}>{contractError}</div>
                )}

                {contractSuccess && (
                  <div className={styles.formSuccess}>{contractSuccess}</div>
                )}

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={contractSubmitting}
                >
                  {contractSubmitting
                    ? ar
                      ? "جارٍ الإصدار..."
                      : "Issuing..."
                    : copy.issueContract}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}