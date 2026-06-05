# ORCA CRM - Message Bus & Telemetry Event Schemas

Below are the schema definitions and JSON payload examples for the events emitted during project lifecycle actions. Every event carries the basic headers: `projectId` (if applicable), `timestamp`, and `actorId` (the active agent performing the action).

---

## 1. Booking Created Event (`booking.created`)
Emitted when a customer reservation is registered. Triggers notifications to the active agent, updates the client pipeline, and locks the unit in the inventory.

### Payload Schema
```json
{
  "eventId": "evt_book_09812",
  "eventType": "booking.created",
  "projectId": "proj_101",
  "timestamp": "2026-06-04T23:42:16Z",
  "actorId": "usr_ali",
  "payload": {
    "bookingId": "bk_7890",
    "unitId": "unit_a101",
    "leadId": "lead_456",
    "reservedPrice": 1200000.0,
    "expiryDate": "2026-06-11T23:59:59Z"
  }
}
```

---

## 2. Contract Created Event (`contract.created`)
Emitted when a sales contract draft is generated. Initiates signature workflows and posts the initial payment requirement to the Accounting service.

### Payload Schema
```json
{
  "eventId": "evt_cont_7712",
  "eventType": "contract.created",
  "projectId": "proj_101",
  "timestamp": "2026-06-04T23:44:00Z",
  "actorId": "usr_ali",
  "payload": {
    "contractId": "ct_9090",
    "bookingId": "bk_7890",
    "templateId": "tpl-2026-01",
    "totalVolumeSar": 1200000.0,
    "parties": [
      {
        "role": "buyer",
        "id": "lead_456",
        "name": "عبد الله محمد"
      },
      {
        "role": "seller",
        "id": "tenant_abaad",
        "name": "مؤسسة أبعاد السكنية"
      }
    ]
  }
}
```

---

## 3. Payment Received Event (`payment.received`)
Emitted by the **Accounting microservice** on successful payment processing. The projects microservice receives this event to update its cached summary totals.

### Payload Schema
```json
{
  "eventId": "evt_pay_5541",
  "eventType": "payment.received",
  "projectId": "proj_101",
  "timestamp": "2026-06-04T23:46:12Z",
  "actorId": "system_accounting",
  "payload": {
    "paymentId": "pay_33211",
    "contractId": "ct_9090",
    "bookingId": "bk_7890",
    "amountSar": 300000.0,
    "paymentMethod": "MADA",
    "installmentIndex": 1
  }
}
```

---

## 4. Construction Progress Reported Event (`construction.reported`)
Emitted when a construction site report is logged. Updates project completion metrics and syncs to client-facing update channels.

### Payload Schema
```json
{
  "eventId": "evt_const_1211",
  "eventType": "construction.reported",
  "projectId": "proj_101",
  "timestamp": "2026-06-04T23:48:00Z",
  "actorId": "usr_ali",
  "payload": {
    "reportId": "rep_9912",
    "phaseId": "phase_2",
    "progressPercent": 42,
    "mediaUrls": [
      "https://assets.orca.pro/media/img1.jpg"
    ]
  }
}
```

---

## 5. Handover Scheduled Event (`handover.scheduled`)
Emitted when a unit handover meeting is set up. Triggers notifications to the client and generates the delivery checklists.

### Payload Schema
```json
{
  "eventId": "evt_hand_6621",
  "eventType": "handover.scheduled",
  "projectId": "proj_101",
  "timestamp": "2026-06-04T23:50:00Z",
  "actorId": "usr_ali",
  "payload": {
    "handoverId": "ho_3232",
    "unitId": "unit_a101",
    "leadId": "lead_456",
    "scheduledAt": "2026-07-01T10:00:00Z"
  }
}
```
