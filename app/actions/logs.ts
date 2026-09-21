"use server";

import { getSession } from "@/lib/session";
import { systemLogger } from "@/lib/resilience/logger";
import fs from "fs";
import path from "path";

/**
 * Fetch the last 100 system logs
 */
export async function getSystemLogsAction() {
  const session = await getSession();
  
  if (!session || session.role !== "Admin") {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    const logFilePath = path.join(process.cwd(), 'logs', 'system.log');
    if (!fs.existsSync(logFilePath)) {
      return { success: true, data: [] };
    }

    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.trim().split('\n').filter(Boolean);
    
    const logs = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { 
            timestamp: new Date().toISOString(), 
            level: 'INFO', 
            message: line,
            tenantId: 'SYSTEM',
            subdomain: 'system',
            userId: 'system',
            action: 'PARSING_ERROR'
          };
        }
      })
      .reverse() // Newest first
      .slice(0, 100);

    return { success: true, data: logs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Clear all system logs
 */
export async function clearSystemLogsAction() {
  const session = await getSession();
  
  if (!session || session.role !== "Admin") {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    const logFilePath = path.join(process.cwd(), 'logs', 'system.log');
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Intentionally triggers a mock error and writes it using systemLogger.error()
 */
export async function triggerMockErrorAction(errorMessage?: string) {
  const session = await getSession();
  
  if (!session || session.role !== "Admin") {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    throw new Error(errorMessage || "خطأ تجريبي متعمد للتحقق من أداء لوحة المراقبة (Simulated Test Failure)");
  } catch (err: any) {
    systemLogger.error(
      "تم التقاط خطأ تجريبي في واجهة الإدارة لغرض التحقق",
      err,
      {
        tenantId: (session.tenantId as string) || "SYSTEM",
        subdomain: (session.subdomain as string) || "system",
        userId: (session.userId as string) || "usr-admin",
        action: "TRIGGER_SIMULATED_FAILURE",
        path: "app/actions/logs.ts",
        triggeredBy: (session.name as string) || "Administrator"
      }
    );
    return { success: true };
  }
}
