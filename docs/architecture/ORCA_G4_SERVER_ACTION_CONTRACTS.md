# ORCA G4 Server Action Contracts

Every exported function detected in `app/actions/**` or a module with `use server` is listed. Counts are derived from the current repository import graph.

## `app/actions/accounting.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getAgingReportAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getArCustomersAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getArReportAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getBalanceSheetAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getCashFlowAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getErpStatsAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getGeneralLedgerAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getIncomeStatementAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getLedgerEntriesAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getPayablesAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getTrialBalanceAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `getVatReportAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `runAccountingAuditAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |
| `seedChartOfAccountsAction` | 11 | 0 | 11 | EVIDENCE_REFERENCED |

## `app/actions/admin.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `adminUpdateTenantPlanAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |
| `adminUpdateTicketAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |
| `getTenantsListAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |
| `getTicketsListAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |
| `toggleTenantStatusAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |
| `updateTenantPlanAction` | 2 | 0 | 16 | EVIDENCE_REFERENCED |

## `app/actions/advertising-integrations.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getAdvertisingConnectionsAction` | 2 | 0 | 3 | EVIDENCE_REFERENCED |
| `saveCustomAdvertisingProviderAction` | 2 | 0 | 4 | EVIDENCE_REFERENCED |
| `saveStandardAdvertisingConnectionAction` | 2 | 0 | 3 | EVIDENCE_REFERENCED |

## `app/actions/agentSlots.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createAgentSlotAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `deactivateAgentSlotAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `getAgentSlotsAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `getAgentStatusAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `getNextAvailableAgentAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `getUsageMetersAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `incrementUsageMeterAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |
| `toggleAgentStatusAction` | 5 | 0 | 2 | EVIDENCE_REFERENCED |

## `app/actions/ai-providers.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `testAIProviderConnectionAction` | 0 | 0 | 1 | EVIDENCE_REFERENCED |

## `app/actions/aiActions.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `analyzeLeadAI` | 3 | 0 | 1 | EVIDENCE_REFERENCED |

## `app/actions/aiClient.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `generateAIInsight` | 3 | 0 | 0 | NOT_PROVEN |

## `app/actions/analytics.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getAnalyticsDataAction` | 1 | 0 | 0 | NOT_PROVEN |

## `app/actions/auth.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `loginAction` | 1 | 0 | 3 | EVIDENCE_REFERENCED |
| `logoutAction` | 1 | 0 | 3 | EVIDENCE_REFERENCED |

## `app/actions/compliance.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `activateGovernmentConnectionAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `checkComplianceReadinessAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `getTenantComplianceInfoAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `saveTenantCredentialsAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `signComplianceDisclaimerAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `updateTenantComplianceDetailsAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |

## `app/actions/contract.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getContractWizardDataAction` | 19 | 0 | 50 | EVIDENCE_REFERENCED |
| `issueContractActionDirect` | 19 | 0 | 50 | EVIDENCE_REFERENCED |
| `saveContractTermsAction` | 19 | 0 | 50 | EVIDENCE_REFERENCED |

## `app/actions/ejar.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getPayrollCommissionsAction` | 11 | 0 | 2 | EVIDENCE_REFERENCED |
| `markCommissionPaidAction` | 11 | 0 | 2 | EVIDENCE_REFERENCED |
| `submitContractToEjarAction` | 11 | 0 | 2 | EVIDENCE_REFERENCED |

## `app/actions/email.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getEmailMessagesAction` | 5 | 6 | 39 | EVIDENCE_REFERENCED |
| `getLeadEmailMessagesAction` | 5 | 6 | 39 | EVIDENCE_REFERENCED |
| `sendEmailAction` | 5 | 6 | 39 | EVIDENCE_REFERENCED |

## `app/actions/errorAgent.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `runAllSystemAgentsAction` | 4 | 0 | 2 | EVIDENCE_REFERENCED |
| `saherTrackSystemErrorsAction` | 4 | 0 | 2 | EVIDENCE_REFERENCED |

## `app/actions/finance.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `processCommissionPayment` | 18 | 0 | 5 | EVIDENCE_REFERENCED |
| `processPayment` | 18 | 0 | 8 | EVIDENCE_REFERENCED |

## `app/actions/growth.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `deleteFollowupSequenceAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getAgentLeasesAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getBaseerInsightAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getFollowupSequencesAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getGrowthMarketingStatsAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getMansourChatsAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `getPlatformConnectionsAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `leaseAgentAction` | 8 | 0 | 5 | EVIDENCE_REFERENCED |
| `saveFollowupSequenceAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `savePlatformConnectionAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `sendMansourMessageAction` | 8 | 0 | 4 | EVIDENCE_REFERENCED |
| `testPlatformConnectionAction` | 8 | 0 | 7 | EVIDENCE_REFERENCED |

## `app/actions/helpdesk.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `closeTicketAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `createTicketAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `getTicketsAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |
| `reopenTicketAction` | 1 | 0 | 5 | EVIDENCE_REFERENCED |

## `app/actions/leads.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `archiveLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `assignLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `createLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `createManagedLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `getAssignableUsersAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `getLeadDetailAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `getLeadStatusValues` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `getLeadsAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `getProjectsAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `recordLeadWhatsAppActivityAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `restoreLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `updateLeadAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |
| `updateLeadStatusAction` | 15 | 0 | 18 | EVIDENCE_REFERENCED |

## `app/actions/logs.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `clearSystemLogsAction` | 0 | 0 | 0 | NOT_PROVEN |
| `getSystemLogsAction` | 0 | 0 | 0 | NOT_PROVEN |
| `triggerMockErrorAction` | 0 | 0 | 0 | NOT_PROVEN |

## `app/actions/marketing-campaigns.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createMarketingCampaignAction` | 3 | 0 | 3 | EVIDENCE_REFERENCED |
| `executeMarketingCampaignCommandAction` | 3 | 0 | 3 | EVIDENCE_REFERENCED |
| `listMarketingCampaignsAction` | 3 | 0 | 2 | EVIDENCE_REFERENCED |

## `app/actions/marketing.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getMarketingOverviewAction` | 2 | 0 | 13 | EVIDENCE_REFERENCED |

## `app/actions/notifications.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getHeaderNotificationsAction` | 0 | 0 | 9 | EVIDENCE_REFERENCED |
| `markAllHeaderNotificationsReadAction` | 0 | 0 | 9 | EVIDENCE_REFERENCED |
| `markHeaderNotificationReadAction` | 0 | 0 | 9 | EVIDENCE_REFERENCED |

## `app/actions/onboarding.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `completeOnboardingAction` | 1 | 0 | 2 | EVIDENCE_REFERENCED |

## `app/actions/payment.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getAvailableProvidersAction` | 0 | 0 | 46 | EVIDENCE_REFERENCED |
| `initiateAddonPaymentAction` | 0 | 0 | 46 | EVIDENCE_REFERENCED |
| `initiateSubscriptionPaymentAction` | 0 | 0 | 46 | EVIDENCE_REFERENCED |

## `app/actions/projects.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createProjectAction` | 3 | 0 | 9 | EVIDENCE_REFERENCED |
| `createProjectActionDirect` | 3 | 0 | 9 | EVIDENCE_REFERENCED |
| `getDetailedProjectsAction` | 3 | 0 | 9 | EVIDENCE_REFERENCED |
| `getProjectUnitsAction` | 3 | 0 | 9 | EVIDENCE_REFERENCED |
| `toggleUnitStatusAction` | 3 | 0 | 9 | EVIDENCE_REFERENCED |

## `app/actions/properties.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `bookUnitActionDirect` | 19 | 0 | 16 | EVIDENCE_REFERENCED |
| `completeHandoverActionDirect` | 19 | 0 | 16 | EVIDENCE_REFERENCED |
| `createUnitActionDirect` | 19 | 0 | 16 | EVIDENCE_REFERENCED |
| `getPropertiesAction` | 19 | 0 | 17 | EVIDENCE_REFERENCED |
| `updateUnitStatusAction` | 19 | 0 | 16 | EVIDENCE_REFERENCED |

## `app/actions/register.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `registerTenantAction` | 0 | 0 | 10 | EVIDENCE_REFERENCED |

## `app/actions/rentals.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getRentalContractsAction` | 1 | 0 | 0 | NOT_PROVEN |

## `app/actions/revenue-integrity.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `acknowledgeRevenueRiskAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `analyzeConversationAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `approveRevenueSuggestionAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `disconnectRevenueProviderAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `executeRevenueSuggestionAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `getIntelligenceScoresAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `getRevenueAuditProofAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `getRevenueIntegrityDashboardAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `getRevenueTrustStateAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `linkRevenueSuggestionLeadAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `listRevenueLinkableLeadsAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `processRevenueOutboxAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `rejectRevenueSuggestionAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `resolveRevenueRiskAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `runRevenueRadarAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `saveRevenueProviderAction` | 19 | 0 | 23 | EVIDENCE_REFERENCED |
| `scoreAllIntelligenceAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `scoreOpportunityIntelligenceAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `scoreRevenueOpportunitiesAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `submitRevenueProviderApplicationAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `testRevenueProviderAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |
| `trainRevenuePredictiveModelAction` | 19 | 0 | 20 | EVIDENCE_REFERENCED |

## `app/actions/saherAgent.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `executeApprovedSaherAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |
| `getSaherDLQStatusAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |
| `getSaherTelemetryLogsAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |
| `processSaherWhatsAppLeadAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |
| `runSaherReplayCycleAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |
| `runSaherTelemetryScanAction` | 18 | 0 | 4 | EVIDENCE_REFERENCED |

## `app/actions/sales.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getSalesPerformanceAction` | 1 | 0 | 24 | EVIDENCE_REFERENCED |

## `app/actions/sentinel.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `runSystemDiagnosticsAction` | 6 | 0 | 10 | EVIDENCE_REFERENCED |

## `app/actions/tasks.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createTaskAction` | 12 | 0 | 14 | EVIDENCE_REFERENCED |
| `getLeadsListAction` | 12 | 0 | 14 | EVIDENCE_REFERENCED |
| `getTasksAction` | 12 | 0 | 14 | EVIDENCE_REFERENCED |
| `toggleTaskStatusAction` | 12 | 0 | 14 | EVIDENCE_REFERENCED |
| `updateTaskAction` | 12 | 0 | 14 | EVIDENCE_REFERENCED |

## `app/actions/tours.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `getToursAction` | 20 | 0 | 15 | EVIDENCE_REFERENCED |
| `scheduleTourActionDirect` | 20 | 0 | 15 | EVIDENCE_REFERENCED |

## `app/actions/users.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createTenantUserAction` | 2 | 8 | 15 | EVIDENCE_REFERENCED |
| `deleteTenantUserAction` | 2 | 8 | 15 | EVIDENCE_REFERENCED |
| `getPlanLimitInfoAction` | 2 | 8 | 15 | EVIDENCE_REFERENCED |
| `getTenantUsersAction` | 2 | 8 | 15 | EVIDENCE_REFERENCED |
| `updateTenantUserAction` | 2 | 8 | 15 | EVIDENCE_REFERENCED |

## `app/actions/whatsapp-crm.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `createWhatsAppTaskAction` | 7 | 7 | 4 | EVIDENCE_REFERENCED |
| `getWhatsAppDashboardStats` | 7 | 7 | 4 | EVIDENCE_REFERENCED |

## `app/actions/whatsapp.ts`

| Action | Models | Permissions | Test refs | Functional evidence |
|---|---:|---:|---:|---|
| `archiveChatAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `assignChatAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `getCloudAPIStatusAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `getWhatsAppAssigneesAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `getWhatsAppChatsAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `sendWhatsAppMessageAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
| `toggleWhatsAppConnectionAction` | 12 | 7 | 32 | EVIDENCE_REFERENCED |
