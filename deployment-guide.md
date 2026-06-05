# ORCA CRM - Projects Workspace Deployment Guide

This guide details the deployment variables, RBAC mappings, and webhook integrations needed to release the updated Projects Workspace.

---

## 1. Environment Variables (`.env`)

Add or update the following configuration variables inside your environment settings:

```bash
# ─── DATABASE SETTINGS ──────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"

# ─── INTEGRATION SERVICE ENDPOINTS ─────────────────────────
# Accounting microservice base url (cross-service financial summaries)
ACCOUNTING_SERVICE_URL="https://accounting.az-ez.pro/api/v1"

# Document repository service url (maps file uploads via documentId)
DOCUMENT_SERVICE_URL="https://docs.az-ez.pro/api/v1"

# ─── SECURE INTEGRATION CREDENTIALS ───────────────────────
# API secret key used to authorize internal webhooks (e.g. accounting payments)
ORCA_INTERNAL_API_KEY="sec_internal_api_key_xyz123"

# JWT token secret for secure session verification
JWT_SECRET="super_secret_jwt_sign_key_99881"
```

---

## 2. Webhook Configuration

### Accounting Payment Notifications
To sync incoming payments from the Accounting service to the Projects summary overlay, register this webhook inside the Accounting control panel:

- **Webhook URL:** `https://orca.az-ez.pro/api/webhooks/accounting/payment-received`
- **Auth Method:** Custom Header
- **Header Name:** `X-API-KEY`
- **Header Value:** Match `ORCA_INTERNAL_API_KEY` (e.g. `sec_internal_api_key_xyz123`)

---

## 3. RBAC Permissions Matrix

Access control levels mapped to CRM employee roles:

| Action Code | Action Name | Roles Allowed |
| :--- | :--- | :--- |
| `VIEW_PROJECTS` | View project index & summary | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER, SALES_EMPLOYEE, MARKETING, READ_ONLY |
| `CREATE_PROJECT` | Initialize new project | PLATFORM_ARCHITECT, ADMIN |
| `ADD_PHASE` | Add development phases | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER |
| `UPDATE_UNIT` | Change unit status (Available, Hold, Sold) | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER, SALES_EMPLOYEE |
| `CREATE_BOOKING` | Create customer reservation | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER, SALES_EMPLOYEE |
| `GENERATE_CONTRACT`| Build sales agreement draft | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER |
| `POST_PROGRESS` | Log construction report | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER |
| `VIEW_FINANCE` | Read detailed cross-service accounts | PLATFORM_ARCHITECT, ADMIN |
| `VIEW_DOCS` | Read document catalog | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER, SALES_EMPLOYEE |
| `UPLOAD_DOC` | Upload blueprints & files | PLATFORM_ARCHITECT, ADMIN, SALES_MANAGER, SALES_EMPLOYEE |
