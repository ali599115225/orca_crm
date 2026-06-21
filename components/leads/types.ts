import type { LeadItem } from "@/components/views/pipeline/KanbanCard";

export type { LeadItem };

export type Opportunity = {
  id: string;
  leadId: string;
  value: number;
  probability: number;
  closeDate: string;
  status: string;
  unitId: string | null;
};

export type UnitOption = {
  id: string;
  unitNumber: string;
  priceSar: number;
  status: string;
  projectName: string;
};

export type Offer = {
  id: string;
  linkedOpportunityId: string;
  unitId: string | null;
  price: number;
  validUntil: string;
  status: string;
  createdAt?: string | null;
};

export type Tour = {
  id: string;
  leadId: string;
  opportunityId: string | null;
  unitId: string | null;
  startAt: string;
  endAt: string | null;
  location: string;
  status: string;
  auditLog?: string | null;
};

export type OpportunityForm = {
  value: string;
  probability: string;
  closeDate: string;
  closeDateText: string;
  unitId: string;
};

export type OpportunityFormErrors = Partial<Record<keyof OpportunityForm, string>> & {
  form?: string;
};

export type OfferForm = {
  opportunityId: string;
  price: string;
  validUntil: string;
  validUntilText: string;
};

export type TourForm = {
  offerId: string;
  startDate: string;
  startDateText: string;
  time: string;
  location: string;
};

export type DetailTab =
  | "summary"
  | "contacts"
  | "tasks"
  | "tours"
  | "offers"
  | "opportunities"
  | "pipeline";

export type Copy = {
  breadcrumb: string;
  title: string;
  subtitle: string;
  totalLeads: string;
  newLeads: string;
  qualified: string;
  conversion: string;
  leadRegistry: string;
  thisWeek: string;
  readyFollowUp: string;
  closedRate: string;
  searchPlaceholder: string;
  leadsList: string;
  lead: string;
  status: string;
  source: string;
  owner: string;
  score: string;
  page: string;
  of: string;
  previous: string;
  next: string;
  loading: string;
  noLeads: string;
  selectLead: string;
  city: string;
  notSpecified: string;
  summary: string;
  contacts: string;
  tasks: string;
  tours: string;
  offers: string;
  opportunities: string;
  pipeline: string;
  leadInfo: string;
  currentStatus: string;
  lastActivity: string;
  assignedTo: string;
  stage: string;
  noContacts: string;
  noTasks: string;
  noTours: string;
  noOffers: string;
  noOpportunities: string;
  leadsUnit: string;
  createOpportunity: string;
  opportunityListTitle: string;
  opportunityLead: string;
  opportunityValue: string;
  opportunityProbability: string;
  opportunityCloseDate: string;
  opportunityStatus: string;
  opportunityUnit: string;
  opportunityUnitPlaceholder: string;
  opportunityNoUnit: string;
  unitsLoading: string;
  noAvailableUnits: string;
  unitsLoadFailed: string;
  opportunitiesLoading: string;
  saveOpportunity: string;
  savingOpportunity: string;
  cancel: string;
  valueRequired: string;
  invalidValue: string;
  invalidProbability: string;
  invalidDate: string;
  unitRequired: string;
  opportunityCreateFailed: string;
  offerListTitle: string;
  createOffer: string;
  offerOpportunity: string;
  offerPrice: string;
  offerValidUntil: string;
  offerUnitReadonly: string;
  offerNoOpportunity: string;
  offerOpportunityRequired: string;
  offerCreateFailed: string;
  saveOffer: string;
  savingOffer: string;
  acceptOffer: string;
  acceptingOffer: string;
  offerAccepted: string;
  legacyOfferBlocked: string;
  tourListTitle: string;
  scheduleTour: string;
  tourOffer: string;
  tourDate: string;
  tourTime: string;
  tourLocation: string;
  tourCreateFailed: string;
  saveTour: string;
  savingTour: string;
  noOfferTours: string;
  offersLoading: string;
  toursLoading: string;
};
