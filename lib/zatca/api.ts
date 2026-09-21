export interface ZatcaApiConfig {
  baseUrl: string;
  apiVersion: string;
  otp?: string;
}

export interface ZatcaSubmissionResponse {
  success: boolean;
  status: string;
  clearanceStatus?: string;
  clearedInvoice?: any;
  reportedInvoice?: any;
  warnings?: string[];
  errors?: string[];
  rawResponse?: any;
}

function getApiConfig(): ZatcaApiConfig {
  const isSandbox = process.env.ZATCA_SANDBOX_MODE !== 'false';
  return {
    baseUrl: isSandbox
      ? 'https://gw-fatoora.zatca.gov.sa:3001'
      : 'https://gw-fatoora.zatca.gov.sa',
    apiVersion: 'v1',
    otp: process.env.ZATCA_OTP,
  };
}

function getAuthHeaders(device: { complianceCert?: string | null; productionCert?: string | null } | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Version': 'V2',
  };
  const cert = device?.productionCert || device?.complianceCert;
  if (cert) {
    headers['Authorization'] = `Bearer ${cert}`;
  }
  return headers;
}

export async function submitReporting(invoiceXml: string, device: { complianceCert?: string | null; productionCert?: string | null } | null): Promise<ZatcaSubmissionResponse> {
  const config = getApiConfig();
  const url = `${config.baseUrl}/api/${config.apiVersion}/invoices/reporting/single`;

  try {
    const body = JSON.stringify([
      {
        invoice: invoiceXml,
        invoiceHash: '',
        uuid: '',
      },
    ]);

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(device),
      body,
    });

    const raw = await response.text();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

    if (response.ok) {
      return {
        success: true,
        status: 'REPORTED',
        reportedInvoice: parsed,
        warnings: parsed.warnings,
        rawResponse: parsed,
      };
    }

    return {
      success: false,
      status: 'REJECTED',
      errors: [parsed?.message || parsed?.error || `HTTP ${response.status}`],
      rawResponse: parsed,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'ERROR',
      errors: [error.message || 'Network error'],
    };
  }
}

export async function submitClearance(invoiceXml: string, device: { complianceCert?: string | null; productionCert?: string | null } | null): Promise<ZatcaSubmissionResponse> {
  const config = getApiConfig();
  const url = `${config.baseUrl}/api/${config.apiVersion}/invoices/clearance/single`;

  try {
    const body = JSON.stringify([
      {
        invoice: invoiceXml,
        invoiceHash: '',
        uuid: '',
      },
    ]);

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(device),
      body,
    });

    const raw = await response.text();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

    if (response.ok) {
      return {
        success: true,
        status: 'CLEARED',
        clearanceStatus: 'CLEARED',
        clearedInvoice: parsed,
        warnings: parsed.warnings,
        rawResponse: parsed,
      };
    }

    return {
      success: false,
      status: 'REJECTED',
      errors: [parsed?.message || parsed?.error || `HTTP ${response.status}`],
      rawResponse: parsed,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'ERROR',
      errors: [error.message || 'Network error'],
    };
  }
}

export async function submitCsid(csr: string, otp: string): Promise<ZatcaSubmissionResponse> {
  const config = getApiConfig();
  const url = `${config.baseUrl}/api/${config.apiVersion}/compliance/CSID`;

  try {
    const body = JSON.stringify({
      csr,
      otp,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Version': 'V2',
      },
      body,
    });

    const raw = await response.text();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

    if (response.ok) {
      return {
        success: true,
        status: 'COMPLETED',
        rawResponse: parsed,
      };
    }

    return {
      success: false,
      status: 'REJECTED',
      errors: [parsed?.message || parsed?.error || `HTTP ${response.status}`],
      rawResponse: parsed,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'ERROR',
      errors: [error.message || 'Network error'],
    };
  }
}

export async function submitProductionCsid(csr: string, complianceCert: string): Promise<ZatcaSubmissionResponse> {
  const config = getApiConfig();
  const url = `${config.baseUrl}/api/${config.apiVersion}/compliance/PCSID`;

  try {
    const body = JSON.stringify({
      csr,
      compliance_certificate: complianceCert,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Version': 'V2',
      },
      body,
    });

    const raw = await response.text();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

    if (response.ok) {
      return {
        success: true,
        status: 'COMPLETED',
        rawResponse: parsed,
      };
    }

    return {
      success: false,
      status: 'REJECTED',
      errors: [parsed?.message || parsed?.error || `HTTP ${response.status}`],
      rawResponse: parsed,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'ERROR',
      errors: [error.message || 'Network error'],
    };
  }
}
