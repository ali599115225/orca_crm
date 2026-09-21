export interface HeartbeatServiceConfig {
  readonly expectedIntervalSeconds: number;
}

export type HeartbeatServicesConfig = Readonly<Record<string, Readonly<HeartbeatServiceConfig>>>;

function serviceConfig(expectedIntervalSeconds: number): Readonly<HeartbeatServiceConfig> {
  return Object.freeze({ expectedIntervalSeconds });
}

export const HEARTBEAT_SERVICES = Object.freeze({
  CRON_BILLING: serviceConfig(86400),
  CRON_SENTINEL: serviceConfig(86400),
  CRON_ZATCA: serviceConfig(86400),
  CRON_SANAD_INSTALLMENTS: serviceConfig(86400),
  CRON_RETENTION: serviceConfig(86400),
  CRON_REALTIME_RETENTION: serviceConfig(86400),
}) satisfies HeartbeatServicesConfig;

export function normalizeHeartbeatServiceId(serviceId: string): string {
  return serviceId.trim().toUpperCase();
}

export function getHeartbeatServiceConfig(
  serviceId: string,
  services: HeartbeatServicesConfig = HEARTBEAT_SERVICES,
): HeartbeatServiceConfig | null {
  const normalized = normalizeHeartbeatServiceId(serviceId);
  const config = services[normalized];
  if (!config || !Number.isFinite(config.expectedIntervalSeconds) || config.expectedIntervalSeconds <= 0) {
    return null;
  }
  return config;
}
