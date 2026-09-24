# ORCA Z2 — Offer, Contract, and Finance Domain Contracts

- **Document ID:** ORCA-Z2-DOM-B-001
- **Version:** 1.0
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT / NOT IMPLEMENTATION CLAIM`

## DOM-05 — Offers, Negotiation, and Reservation

### Purpose

Create a controlled commercial proposal from approved inventory and customer context, preserve every version and approval, and convert only an eligible accepted offer into an atomic reservation or contract path.

### Core entities

- `Offer`: commercial negotiation aggregate.
- `OfferVersion`: immutable terms snapshot.
- `OfferLine`: inventory, price, tax/fee, quantity, or commercial component.
- `OfferApproval`: requested/decided authority record.
- `CounterOffer`: party/source and proposed changes.
- `Reservation`: time-bounded commitment against inventory.
- `CommercialException`: discount, waiver, custom term, or policy override.

### Offer lifecycle

```text
DRAFT
→ INTERNAL_REVIEW
→ APPROVAL_PENDING
→ APPROVED_TO_ISSUE
→ ISSUED
→ VIEWED | NEGOTIATING
→ ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
```

`COUNTERED` creates a new draft/version and does not mutate the issued version.

### Reservation lifecycle

```text
PENDING
→ ACTIVE
→ CONVERTED_TO_CONTRACT
```

Terminal alternatives: `EXPIRED`, `RELEASED`, `CANCELLED`, `REJECTED_CONFLICT`.

### Required commands

| Command | Preconditions | Result/control |
|---|---|---|
| `CreateOfferDraft` | valid opportunity/customer and eligible inventory | DRAFT; current price/evidence references captured |
| `CreateOfferVersion` | editable state and authorized actor | immutable new version; prior version retained |
| `SubmitOfferForApproval` | required fields and exception calculation complete | APPROVAL_PENDING; approver selected by policy |
| `ApproveOffer` | independent authority and within delegation | APPROVED_TO_ISSUE with approval evidence |
| `IssueOffer` | approved current version, valid dates, eligible inventory | ISSUED; delivery state separate |
| `RecordCounterOffer` | issued/negotiating | counter record + new draft/version |
| `AcceptOffer` | current issued version valid; inventory rechecked | ACCEPTED; acceptance evidence; no automatic contract activation |
| `CreateReservation` | accepted/approved offer and inventory available | ACTIVE reservation atomically |
| `ExpireReservation` | expiry elapsed and not converted | EXPIRED; inventory released idempotently |
| `WithdrawOffer` | policy permits and not accepted/converted | WITHDRAWN with reason |

### Invariants

- Issued offer versions are immutable.
- Approval is tied to exact version, amount, currency, exceptions, and effective period.
- Changing material terms invalidates prior approval unless policy explicitly permits the change.
- Acceptance references exact version and evidence/time/source.
- Reservation creation rechecks inventory and uses a transaction/unique commitment rule.
- Offer issue/delivery are distinct: provider failure cannot mark delivered/viewed.
- Discounts, waivers, and exceptions beyond approved limits require an authorized approver other than the requester when policy requires.
- An expired/withdrawn/rejected offer cannot be accepted.

### Failure/recovery

- stale offer version → reject action and return current version;
- inventory conflict → acceptance may remain recorded but reservation becomes controlled exception, or acceptance is atomic with reservation according to approved policy; policy must be explicit in Z4;
- provider send failure → offer remains approved/issued internally with delivery failed/pending, not delivered;
- approval actor conflict → deny and route alternate approver;
- reservation expiry job replay → deterministic no-op after first completion.

### Acceptance/tests

- immutable version tests;
- exact-version approval/acceptance tests;
- unauthorized/self-approval negative tests;
- expiry boundary tests;
- concurrent reservation test;
- counter-offer history preservation;
- provider delivery truth tests;
- idempotent acceptance/reservation/expiry tests.

---

## DOM-06 — Contracts and Deal Lifecycle

### Purpose

Transform an eligible accepted commercial outcome into a controlled legal/business record with fixed parties, terms, approvals, signature/evidence, activation, amendment, renewal, cancellation, and termination.

### Core entities

- `Contract`.
- `ContractVersion` immutable content/metadata snapshot.
- `ContractParty` and authority/identity evidence.
- `ContractApproval`.
- `SignatureRequest` and `SignatureEvidence`.
- `ContractObligation`.
- `ContractAmendment`.
- `ContractTermination`.
- `ContractTemplateReference` to an owner-approved template/version.

### Lifecycle

```text
DRAFT
→ DATA_PENDING
→ REVIEW_PENDING
→ APPROVAL_PENDING
→ APPROVED
→ SIGNATURE_PENDING
→ SIGNED
→ ACTIVATION_PENDING
→ ACTIVE
→ COMPLETED | TERMINATED | CANCELLED
→ ARCHIVED
```

Side states: `AMENDMENT_PENDING`, `RENEWAL_PENDING`, `SUSPENDED`, `DISPUTED`.

### Commands and authority

| Command | Preconditions | Control/result |
|---|---|---|
| `CreateContractDraft` | accepted offer/reservation or approved direct-contract exception | DRAFT with source references |
| `SetParties` | authorized actor; identity/authority fields | new draft/version as material change |
| `SubmitContractForReview` | required data/docs complete | REVIEW_PENDING |
| `ApproveContract` | authorized approver; exact version; SoD rules | APPROVED |
| `RequestSignature` | approved version and configured/manual evidence path | SIGNATURE_PENDING; provider state separate |
| `RecordSignatureEvidence` | verified response/manual evidence authority | SIGNED only when all required parties/evidence satisfied |
| `ActivateContract` | SIGNED, valid dates, approvals, inventory commitment, obligations ready | ACTIVE atomically with downstream obligations/events |
| `ProposeAmendment` | eligible active contract | AMENDMENT_PENDING; original remains authoritative until effective |
| `ApproveAndApplyAmendment` | exact amendment version approved/signed as required | new effective contract version/history |
| `TerminateContract` | authority, grounds, date, impact/settlement checks | TERMINATED; downstream actions/events |
| `CompleteContract` | obligations and completion criteria met | COMPLETED |
| `ArchiveContract` | terminal and retention permits archive | ARCHIVED; evidence preserved |

### Invariants

- No contract is active without a fixed approved/signed version and complete parties.
- Official templates and signatory authority are owner evidence; the platform cannot invent them.
- Signature provider state is not the contract state. A configured provider response must be verified; `NOT_CONFIGURED` uses an approved manual/offline evidence workflow only.
- Material changes create a new version and approval/signature path.
- Activation is idempotent and cannot create duplicate financial obligations or inventory commitments.
- Contract status cannot be set directly from the browser without the domain transition.
- Cancellation before activation and termination after activation are distinct.
- Audit/evidence includes who approved, signed evidence references, effective times, and reason for exceptions.
- Electronic transaction/REGA form requirements remain conditional on owner-confirmed applicability.

### Failure/recovery

- missing party/authority/template evidence → DATA_PENDING or dependency error;
- signature webhook replay/invalid signature → no transition; security/provider audit;
- partial activation downstream failure → transaction rollback or resumable outbox state with no duplicate obligations;
- amendment conflict with later version → concurrency conflict;
- termination blocked by unresolved policy requirement → approval/task path;
- provider unavailable → signature request pending/failed, never falsely signed.

### Acceptance/tests

- exact-version approval/signature tests;
- all-required-party signature rule;
- invalid/replayed webhook tests;
- activation idempotency and transaction rollback;
- duplicate obligation prevention;
- unauthorized activation/termination tests;
- amendment version and effective-date tests;
- manual evidence authority/audit tests;
- archive/retention hold tests.

---

## DOM-07 — Invoices, Installments, Payment Evidence, Reconciliation, Settlement, and Refund Requests

### Purpose

Represent contractual financial obligations and evidence-backed outcomes without turning ORCA into an unapproved payment processor or storing prohibited card data.

### Core entities

- `Invoice` and immutable `InvoiceVersion` where issued documents are revised through credit/debit/cancellation patterns rather than silent edits.
- `InvoiceLine`.
- `InstallmentSchedule` and `Installment`.
- `PaymentRequestReference` (provider-agnostic, no PAN).
- `PaymentEvidence` (provider transaction reference, bank/manual evidence, amount/currency/time/source/verification state).
- `Allocation` linking evidence to obligations.
- `ReconciliationCase`.
- `SettlementRecord`.
- `RefundRequest` and `RefundExecutionEvidence`.
- `FinancialAdjustment` and approval.
- `Receipt` evidence.

### Invoice lifecycle

```text
DRAFT
→ REVIEW_PENDING
→ APPROVED
→ ISSUED
→ PARTIALLY_PAID
→ PAID
→ SETTLED
→ CLOSED
```

Alternatives: `OVERDUE`, `DISPUTED`, `CANCELLED`, `VOIDED`, `WRITE_OFF_PENDING`, `WRITTEN_OFF`.

### Installment lifecycle

```text
SCHEDULED
→ DUE
→ PARTIALLY_PAID
→ PAID
```

Alternatives: `OVERDUE`, `WAIVED_PENDING`, `WAIVED`, `RESCHEDULE_PENDING`, `CANCELLED`.

### Payment evidence lifecycle

```text
RECEIVED
→ VERIFICATION_PENDING
→ VERIFIED
→ ALLOCATED
→ RECONCILED
```

Alternatives: `REJECTED`, `DUPLICATE`, `REVERSED`, `DISPUTED`.

### Refund request lifecycle

```text
DRAFT
→ REVIEW_PENDING
→ APPROVAL_PENDING
→ APPROVED
→ EXECUTION_PENDING
→ EXECUTED
→ RECONCILED
→ CLOSED
```

Alternatives: `REJECTED`, `CANCELLED`, `FAILED`, `PARTIALLY_EXECUTED`.

### Required commands

| Command | Preconditions | Control/result |
|---|---|---|
| `CreateInvoiceFromContract` | active/eligible contract obligation | deterministic invoice/reference; no duplicate source obligation |
| `ApproveInvoice` | exact draft/version and authority | APPROVED |
| `IssueInvoice` | approved and required tax/business fields complete | ISSUED; external delivery state separate |
| `GenerateInstallments` | approved schedule terms | idempotent schedule tied to contract/invoice version |
| `RecordPaymentEvidence` | allowed evidence source; no prohibited card data | RECEIVED/VERIFICATION_PENDING |
| `VerifyPaymentEvidence` | independent/automated trusted verifier | VERIFIED or REJECTED with reason |
| `AllocatePayment` | verified amount/currency and open obligations | atomic allocation; no over-allocation |
| `ReconcilePayment` | allocations and provider/bank totals agree | RECONCILED; exception otherwise |
| `CreateSettlement` | reconciled eligible records | settlement record and audit |
| `RequestRefund` | eligible evidence/contract/business reason | approval workflow; no automatic payment |
| `ApproveRefund` | delegated independent authority | APPROVED exact amount/reason/destination reference |
| `RecordRefundExecution` | verified provider/bank evidence | EXECUTED/FAILED; no secret/card data |
| `ReverseEvidence` | verified reversal/chargeback authority | REVERSED; downstream balances recalculated by controlled entries |

### Invariants

- Amounts use explicit currency and decimal precision; no binary floating-point business calculations.
- Issued invoice content is not silently edited.
- `PAID` derives from verified allocated evidence equaling the obligation according to tolerance/policy.
- UI/operator assertions alone cannot set `PAID`, `EXECUTED`, or `RECONCILED`.
- Payment and refund provider credentials/accounts belong to the company; `NOT_CONFIGURED` leaves record workflows functional without execution claims.
- PAN, CVV, PIN, full magnetic-stripe, or sensitive authentication data are prohibited from fields, files, logs, prompts, and audit.
- Allocation cannot exceed verified available evidence or open obligation.
- Refund total cannot exceed eligible net received/approved amount after prior refunds/reversals.
- The requester cannot finally approve/execute their own high-risk refund where SoD policy applies.
- Financial corrections use auditable reversal/adjustment entries rather than destructive edits.
- Tax/ZATCA compliance state is conditional and cannot be claimed without owner/applicability/credential evidence.

### Failure/recovery

- duplicate provider webhook/reference → idempotent prior result or duplicate review;
- partial provider timeout → execution pending/unknown, not failed or executed until reconciled;
- amount/currency mismatch → reconciliation case;
- over-allocation → integrity violation and rollback;
- refund failure → FAILED/EXECUTION_PENDING recovery, no duplicate retry without idempotency key;
- chargeback/reversal → append reversal evidence and recalculate controlled balances;
- invoice delivery provider failure → issued internally, delivery failed; no status corruption.

### Acceptance/tests

- exact decimal/currency calculations;
- invoice/installment idempotency;
- verified-evidence requirement for paid state;
- duplicate/replayed webhook tests;
- allocation concurrency/over-allocation rollback;
- reversal/chargeback balance tests;
- refund amount and SoD tests;
- provider timeout unknown-state recovery;
- prohibited card-data scans/tests;
- audit trail for every adjustment;
- conditional ZATCA/provider state tests.

## Cross-domain transaction contracts

### Accepted offer to reservation

Atomic boundary or compensating design must guarantee:

- exact accepted offer version;
- current inventory eligibility;
- one active compatible commitment;
- audit and event;
- deterministic retry result.

### Contract activation

Activation must guarantee or reliably resume:

- exact signed/approved contract version;
- inventory commitment conversion;
- contract state activation;
- financial obligation generation;
- document/evidence reference;
- audit/outbox event;
- no duplicates after retry.

### Payment evidence to invoice state

The sequence must guarantee:

- evidence verification before allocation;
- atomic allocation/balance update;
- invoice/installment state derived from balances;
- reconciliation exception rather than silent mismatch;
- duplicate webhook idempotency.

## Contract result

```text
DOMAINS COVERED: DOM-05..DOM-07
STATE MACHINES: DEFINED
HUMAN APPROVAL BOUNDARIES: DEFINED
FINANCIAL INTEGRITY RULES: DEFINED
PAYMENT-SCOPE MINIMIZATION: DEFINED
FAILURE/IDEMPOTENCY/CONCURRENCY TESTS: DEFINED
CURRENT CODE MATCH: NOT CLAIMED
```
