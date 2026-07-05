"use client";

// Opportunities / Offers / Tours management for a single lead on the
// official detail page. Reuses the central dialogs and panels unchanged.
// Tours are linked via tour.leadId, tour.opportunityId, and the official
// tour.offerId relation — auditLog is never parsed.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { DisplayLocale } from "@/lib/display";
import { displayEntity } from "@/lib/display";
import { formatDisplayTime } from "@/lib/display/dateTime";
import type {
  LeadItem,
  Opportunity,
  Offer,
  Tour,
  UnitOption,
  OpportunityForm,
  OpportunityFormErrors,
  OfferForm,
  TourForm,
} from "@/components/leads/types";
import {
  formatNumber,
  formatCurrency,
  formatDate,
  normalizeDateFieldText,
  parseDateFieldToIso,
} from "@/components/leads/helpers";
import LeadToursPanel from "@/components/leads/panels/LeadToursPanel";
import LeadOffersPanel from "@/components/leads/panels/LeadOffersPanel";
import LeadOpportunitiesPanel from "@/components/leads/panels/LeadOpportunitiesPanel";
import CreateOpportunityDialog from "@/components/leads/dialogs/CreateOpportunityDialog";
import CreateOfferDialog from "@/components/leads/dialogs/CreateOfferDialog";
import ScheduleTourDialog from "@/components/leads/dialogs/ScheduleTourDialog";
import type { LeadsCopy } from "@/features/leads/copy/leadsCopy";

export type EngagementTab = "tours" | "offers" | "opportunities";

interface EngagementTabsProps {
  leadId: string;
  leadName: string;
  activeTab: EngagementTab;
  labels: LeadsCopy;
  isArabic: boolean;
  direction: "rtl" | "ltr";
  displayLocale: DisplayLocale;
  canWrite: boolean;
  onDataChanged?: () => void;
}

export default function EngagementTabs({
  leadId,
  leadName,
  activeTab,
  labels,
  isArabic,
  direction,
  displayLocale,
  canWrite,
  onDataChanged,
}: EngagementTabsProps) {
  // The shared panels/dialogs take a LeadItem; only the display name is
  // consumed. The deprecated `stage` field is intentionally left empty.
  const leadItem: LeadItem = useMemo(
    () => ({
      id: leadId,
      firstName: leadName,
      lastName: null,
      city: "",
      source: "",
      leadScore: 0,
      stage: "",
      projectId: null,
      assignedTo: null,
    }),
    [leadId, leadName],
  );

  const leadDisplayName = useCallback(() => leadName, [leadName]);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [toursLoading, setToursLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [opportunitySaving, setOpportunitySaving] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);
  const [tourSaving, setTourSaving] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [unitSelectOpen, setUnitSelectOpen] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>({
    value: "",
    probability: "50",
    closeDate: "",
    closeDateText: "",
    unitId: "",
  });
  const [opportunityErrors, setOpportunityErrors] = useState<OpportunityFormErrors>({});
  const [offerForm, setOfferForm] = useState<OfferForm>({
    opportunityId: "",
    price: "",
    validUntil: "",
    validUntilText: "",
  });
  const [offerErrors, setOfferErrors] = useState<
    Partial<Record<keyof OfferForm, string>> & { form?: string }
  >({});
  const [tourForm, setTourForm] = useState<TourForm>({
    offerId: "",
    startDate: "",
    startDateText: "",
    time: "10:00",
    location: "",
  });
  const [tourErrors, setTourErrors] = useState<
    Partial<Record<keyof TourForm, string>> & { form?: string }
  >({});

  const unitDisplayLabel = (unit?: UnitOption | null): string => {
    if (!unit) return labels.opportunityNoUnit;
    const project = displayEntity(unit.projectName, "project", displayLocale, {
      route: "/operations/leads",
      entityId: unit.id,
      fieldName: "projectName",
    });
    const unitNumber = displayEntity(unit.unitNumber, "unit", displayLocale, {
      route: "/operations/leads",
      entityId: unit.id,
      fieldName: "unitNumber",
    });
    const parts = [project, unitNumber].filter((part) => part && part !== labels.notSpecified);
    return parts.length > 0 ? parts.join(" · ") : labels.opportunityNoUnit;
  };

  const loadOpportunities = useCallback(async () => {
    try {
      setOpportunitiesLoading(true);
      const res = await fetch("/api/v1/opportunities");
      const json = await res.json();
      setOpportunities(json.success && Array.isArray(json.data) ? json.data : []);
    } catch {
      setOpportunities([]);
    } finally {
      setOpportunitiesLoading(false);
    }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      const res = await fetch("/api/v1/offers");
      const json = await res.json();
      setOffers(json.success && Array.isArray(json.data) ? json.data : []);
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  const loadTours = useCallback(async () => {
    try {
      setToursLoading(true);
      const res = await fetch("/api/v1/tours");
      const json = await res.json();
      setTours(json.success && Array.isArray(json.data) ? json.data : []);
    } catch {
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      setUnitsLoading(true);
      setUnitsError(null);
      const res = await fetch("/api/properties");
      const json = await res.json();
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(labels.unitsLoadFailed);
      }
      setUnits(
        json.data.map((unit: any) => ({
          id: unit.id,
          unitNumber: unit.unitNumber || unit.sku || unit.id,
          priceSar: Number(unit.price ?? unit.priceSar ?? 0),
          status: unit.status || "",
          projectName:
            typeof unit.project === "string" ? unit.project : unit.project?.name || "",
        })),
      );
    } catch {
      setUnits([]);
      setUnitsError(labels.unitsLoadFailed);
    } finally {
      setUnitsLoading(false);
    }
  }, [labels.unitsLoadFailed]);

  useEffect(() => {
    void loadOpportunities();
    void loadUnits();
    if (activeTab === "offers" || activeTab === "tours") {
      void loadOffers();
    }
    if (activeTab === "tours") {
      void loadTours();
    }
  }, [activeTab, loadOpportunities, loadUnits, loadOffers, loadTours]);

  useEffect(() => {
    if (!showOpportunityModal && !showOfferModal && !showTourModal) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowOpportunityModal(false);
        setShowOfferModal(false);
        setShowTourModal(false);
        setUnitSelectOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOpportunityModal, showOfferModal, showTourModal]);

  // ── Scoped data ────────────────────────────────────────────────────────────
  const leadOpportunities = opportunities.filter((opportunity) => opportunity.leadId === leadId);
  const leadOpportunityIds = new Set(leadOpportunities.map((opportunity) => opportunity.id));
  const leadOffers = offers.filter((offer) => leadOpportunityIds.has(offer.linkedOpportunityId));
  const leadOfferIds = new Set(leadOffers.map((offer) => offer.id));
  const leadTours = tours.filter((tour) => {
    if (tour.leadId === leadId) return true;
    if (tour.opportunityId && leadOpportunityIds.has(tour.opportunityId)) return true;
    const offerId = (tour as Tour & { offerId?: string | null }).offerId;
    return Boolean(offerId && leadOfferIds.has(offerId));
  });
  const offerableOpportunities = leadOpportunities.filter((opportunity) => opportunity.unitId);
  const offerFormOpportunity = offerableOpportunities.find(
    (opportunity) => opportunity.id === offerForm.opportunityId,
  );
  const offerFormUnit = units.find((unit) => unit.id === offerFormOpportunity?.unitId);
  const selectableUnits = units.filter((unit) => unit.status.toLowerCase() !== "sold");
  const selectedUnit = selectableUnits.find((unit) => unit.id === opportunityForm.unitId);
  const hasValidSelectedUnit = selectableUnits.some((unit) => unit.id === opportunityForm.unitId);

  // ── Opportunity handlers ──────────────────────────────────────────────────
  const resetOpportunityForm = () => {
    setOpportunityForm({ value: "", probability: "50", closeDate: "", closeDateText: "", unitId: "" });
    setOpportunityErrors({});
    setUnitSelectOpen(false);
  };

  const openOpportunityModal = () => {
    if (!canWrite) return;
    resetOpportunityForm();
    setShowOpportunityModal(true);
    void loadUnits();
  };

  const closeOpportunityModal = () => {
    if (opportunitySaving) return;
    setShowOpportunityModal(false);
    resetOpportunityForm();
  };

  const validateOpportunityForm = () => {
    const errors: OpportunityFormErrors = {};
    const valueNumber = Number(opportunityForm.value);
    const probabilityNumber = Number(opportunityForm.probability);

    if (!opportunityForm.value.trim()) {
      errors.value = labels.valueRequired;
    } else if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      errors.value = labels.invalidValue;
    }
    if (!Number.isFinite(probabilityNumber) || probabilityNumber < 1 || probabilityNumber > 100) {
      errors.probability = labels.invalidProbability;
    }
    if (
      opportunityForm.closeDateText &&
      (!opportunityForm.closeDate || opportunityForm.closeDateText.length !== 10)
    ) {
      errors.closeDate = labels.invalidDate;
    }
    if (!selectableUnits.some((unit) => unit.id === opportunityForm.unitId)) {
      errors.unitId = labels.unitRequired;
    }

    setOpportunityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOpportunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateOpportunityForm()) return;

    try {
      setOpportunitySaving(true);
      setOpportunityErrors({});

      const res = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          value: opportunityForm.value,
          probability: opportunityForm.probability,
          closeDate: opportunityForm.closeDate,
          unitId: opportunityForm.unitId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.opportunityCreateFailed);
      }

      setShowOpportunityModal(false);
      resetOpportunityForm();
      await Promise.all([loadOpportunities(), loadUnits()]);
      onDataChanged?.();
    } catch (error: any) {
      setOpportunityErrors({ form: error?.message || labels.opportunityCreateFailed });
    } finally {
      setOpportunitySaving(false);
    }
  };

  // ── Offer handlers ────────────────────────────────────────────────────────
  const resetOfferForm = () => {
    setOfferForm({ opportunityId: "", price: "", validUntil: "", validUntilText: "" });
    setOfferErrors({});
  };

  const openOfferModal = () => {
    if (!canWrite) return;
    const firstOpportunity = leadOpportunities.find((opportunity) => opportunity.unitId);
    resetOfferForm();
    if (firstOpportunity) {
      setOfferForm({
        opportunityId: firstOpportunity.id,
        price: String(Number(firstOpportunity.value || 0)),
        validUntil: "",
        validUntilText: "",
      });
    }
    setShowOfferModal(true);
    void Promise.all([loadOpportunities(), loadOffers(), loadUnits()]);
  };

  const closeOfferModal = () => {
    if (offerSaving) return;
    setShowOfferModal(false);
    resetOfferForm();
  };

  const handleCreateOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedOpportunity = leadOpportunities.find(
      (opportunity) => opportunity.id === offerForm.opportunityId,
    );
    const errors: Partial<Record<keyof OfferForm, string>> & { form?: string } = {};

    if (!selectedOpportunity?.unitId) errors.opportunityId = labels.offerOpportunityRequired;
    if (!offerForm.price || Number(offerForm.price) <= 0) errors.price = labels.invalidValue;
    if (offerForm.validUntilText && (!offerForm.validUntil || offerForm.validUntilText.length !== 10)) {
      errors.validUntil = labels.invalidDate;
    }

    setOfferErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedOpportunity) return;

    try {
      setOfferSaving(true);
      const res = await fetch(`/api/v1/opportunities/${selectedOpportunity.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: offerForm.price, validUntil: offerForm.validUntil }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.offerCreateFailed);
      }

      setShowOfferModal(false);
      resetOfferForm();
      await Promise.all([loadOffers(), loadOpportunities()]);
      onDataChanged?.();
    } catch (error: any) {
      setOfferErrors({ form: error?.message || labels.offerCreateFailed });
    } finally {
      setOfferSaving(false);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!canWrite || !offer.unitId || acceptingOfferId) return;

    try {
      setAcceptingOfferId(offer.id);
      const res = await fetch(`/api/v1/offers/${offer.id}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.offerCreateFailed);
      }
      await Promise.all([loadOffers(), loadOpportunities(), loadTours()]);
      onDataChanged?.();
    } catch {
      // Non-blocking: the panel state simply stays unchanged.
    } finally {
      setAcceptingOfferId(null);
    }
  };

  // ── Tour handlers ─────────────────────────────────────────────────────────
  const resetTourForm = () => {
    setTourForm({ offerId: "", startDate: "", startDateText: "", time: "10:00", location: "" });
    setTourErrors({});
  };

  const openTourModal = (offer: Offer) => {
    if (!canWrite) return;
    resetTourForm();
    const unit = units.find((item) => item.id === offer.unitId);
    setTourForm({
      offerId: offer.id,
      startDate: "",
      startDateText: "",
      time: "10:00",
      location: unit ? unitDisplayLabel(unit) : "",
    });
    setShowTourModal(true);
  };

  const closeTourModal = () => {
    if (tourSaving) return;
    setShowTourModal(false);
    resetTourForm();
  };

  const handleScheduleTour = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedOffer = leadOffers.find((offer) => offer.id === tourForm.offerId);
    const errors: Partial<Record<keyof TourForm, string>> & { form?: string } = {};

    if (!selectedOffer?.unitId) errors.offerId = labels.legacyOfferBlocked;
    if (!tourForm.startDate || tourForm.startDateText.length !== 10) errors.startDate = labels.invalidDate;
    if (!tourForm.location.trim()) errors.location = labels.tourLocation;

    setTourErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedOffer) return;

    try {
      setTourSaving(true);
      const startAt = `${tourForm.startDate}T${tourForm.time || "10:00"}:00`;

      const res = await fetch("/api/v1/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          startAt,
          location: tourForm.location.trim(),
          attendees: 1,
          notes: labels.scheduleTour,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.tourCreateFailed);
      }

      setShowTourModal(false);
      resetTourForm();
      await Promise.all([loadTours(), loadOffers()]);
      onDataChanged?.();
    } catch (error: any) {
      setTourErrors({ form: error?.message || labels.tourCreateFailed });
    } finally {
      setTourSaving(false);
    }
  };

  return (
    <div>
      {activeTab === "tours" && (
        <LeadToursPanel
          labels={labels}
          selectedLead={leadItem}
          toursLoading={toursLoading}
          selectedLeadTours={leadTours}
          units={units}
          isArabic={isArabic}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatDate={formatDate}
          formatDisplayTime={formatDisplayTime}
        />
      )}

      {activeTab === "offers" && (
        <LeadOffersPanel
          labels={labels}
          selectedLead={leadItem}
          offersLoading={offersLoading}
          selectedLeadOffers={leadOffers}
          opportunities={opportunities}
          units={units}
          offerableOpportunities={canWrite ? offerableOpportunities : []}
          isArabic={isArabic}
          acceptingOfferId={acceptingOfferId}
          openOfferModal={openOfferModal}
          openTourModal={openTourModal}
          handleAcceptOffer={handleAcceptOffer}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === "opportunities" && (
        <LeadOpportunitiesPanel
          labels={labels}
          selectedLead={leadItem}
          opportunitiesLoading={opportunitiesLoading}
          selectedLeadOpportunities={leadOpportunities}
          units={units}
          isArabic={isArabic}
          displayLocale={displayLocale}
          openOpportunityModal={canWrite ? openOpportunityModal : () => {}}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          formatDate={formatDate}
        />
      )}

      {showOfferModal && (
        <CreateOfferDialog
          labels={labels}
          selectedLead={leadItem}
          offerForm={offerForm}
          setOfferForm={setOfferForm}
          offerErrors={offerErrors}
          setOfferErrors={setOfferErrors}
          offerableOpportunities={offerableOpportunities}
          units={units}
          isArabic={isArabic}
          direction={direction}
          offerSaving={offerSaving}
          offerFormOpportunity={offerFormOpportunity}
          offerFormUnit={offerFormUnit}
          closeOfferModal={closeOfferModal}
          handleCreateOffer={handleCreateOffer}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
        />
      )}

      {showTourModal && (
        <ScheduleTourDialog
          labels={labels}
          selectedLead={leadItem}
          tourForm={tourForm}
          setTourForm={setTourForm}
          tourErrors={tourErrors}
          setTourErrors={setTourErrors}
          direction={direction}
          tourSaving={tourSaving}
          closeTourModal={closeTourModal}
          handleScheduleTour={handleScheduleTour}
          leadDisplayName={leadDisplayName}
          normalizeDateFieldText={normalizeDateFieldText}
          parseDateFieldToIso={parseDateFieldToIso}
        />
      )}

      {showOpportunityModal && (
        <CreateOpportunityDialog
          labels={labels}
          selectedLead={leadItem}
          opportunityForm={opportunityForm}
          setOpportunityForm={setOpportunityForm}
          opportunityErrors={opportunityErrors}
          setOpportunityErrors={setOpportunityErrors}
          unitSelectOpen={unitSelectOpen}
          setUnitSelectOpen={setUnitSelectOpen}
          unitsLoading={unitsLoading}
          selectedUnit={selectedUnit}
          hasValidSelectedUnit={hasValidSelectedUnit}
          unitsError={unitsError}
          selectableUnits={selectableUnits}
          opportunitySaving={opportunitySaving}
          isArabic={isArabic}
          direction={direction}
          closeOpportunityModal={closeOpportunityModal}
          handleCreateOpportunity={handleCreateOpportunity}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          normalizeDateFieldText={normalizeDateFieldText}
          parseDateFieldToIso={parseDateFieldToIso}
        />
      )}
    </div>
  );
}
