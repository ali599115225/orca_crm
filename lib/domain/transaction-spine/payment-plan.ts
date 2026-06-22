import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat/engine";
import { assertTenantOwnership } from "./validate-tenant";
import {
  CONTRACT_STATUS,
  DEFAULT_PAYMENT_DUE_DAYS,
  PAYMENT_PLAN_STATUS,
  PAYMENT_PLAN_TEMPLATE,
} from "./constants";
import type {
  ConfigurePaymentPlanInput,
  PaymentPlanTemplate,
  PaymentScheduleItem,
} from "./types";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeDate(value: Date | string | undefined, fallbackDays = 0): Date {
  const fallback = addDays(new Date(), fallbackDays);
  if (!value) return fallback;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid payment due date.");
  return parsed;
}

function splitEvenly(total: number, count: number): number[] {
  const totalMinor = Math.round(total * 100);
  const baseMinor = Math.floor(totalMinor / count);
  const remainder = totalMinor - baseMinor * count;

  return Array.from({ length: count }, (_, index) =>
    (baseMinor + (index < remainder ? 1 : 0)) / 100,
  );
}

export function calculateContractInvoiceTotal(
  subtotal: number,
  vatType: "STANDARD" | "ZERO_RATED" | "EXEMPT" = "STANDARD",
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    throw new Error("Contract value must be positive.");
  }
  return roundMoney(calculateVat(subtotal, vatType).totalAmount);
}

export function buildPaymentSchedule(input: {
  totalAmount: number;
  template: PaymentPlanTemplate;
  firstDueDate?: Date | string;
  intervalDays?: number;
  installmentCount?: number;
  depositPercent?: number;
  customInstallments?: Array<{ amountSar: number; dueDate: Date | string }>;
}): PaymentScheduleItem[] {
  const totalAmount = roundMoney(input.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Payment plan total must be positive.");
  }

  const firstDueDate = normalizeDate(
    input.firstDueDate,
    DEFAULT_PAYMENT_DUE_DAYS,
  );
  const intervalDays = input.intervalDays ?? 30;
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 366) {
    throw new Error("Payment interval must be between 1 and 366 days.");
  }

  if (input.template === PAYMENT_PLAN_TEMPLATE.SINGLE_PAYMENT) {
    return [{ installmentNumber: 1, amountSar: totalAmount, dueDate: firstDueDate }];
  }

  if (input.template === PAYMENT_PLAN_TEMPLATE.DEPOSIT_AND_BALANCE) {
    const depositPercent = input.depositPercent ?? 10;
    if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent >= 100) {
      throw new Error("Deposit percent must be greater than 0 and less than 100.");
    }

    const deposit = roundMoney((totalAmount * depositPercent) / 100);
    const balance = roundMoney(totalAmount - deposit);
    return [
      { installmentNumber: 1, amountSar: deposit, dueDate: firstDueDate },
      {
        installmentNumber: 2,
        amountSar: balance,
        dueDate: addDays(firstDueDate, intervalDays),
      },
    ];
  }

  if (input.template === PAYMENT_PLAN_TEMPLATE.MONTHLY) {
    const count = input.installmentCount ?? 3;
    if (!Number.isInteger(count) || count < 2 || count > 120) {
      throw new Error("Installment count must be between 2 and 120.");
    }

    return splitEvenly(totalAmount, count).map((amountSar, index) => ({
      installmentNumber: index + 1,
      amountSar,
      dueDate: addDays(firstDueDate, intervalDays * index),
    }));
  }

  if (input.template === PAYMENT_PLAN_TEMPLATE.CUSTOM) {
    const custom = input.customInstallments || [];
    if (custom.length < 1 || custom.length > 120) {
      throw new Error("Custom payment plan must contain between 1 and 120 installments.");
    }

    const schedule = custom.map((item, index) => {
      const amountSar = roundMoney(Number(item.amountSar));
      if (!Number.isFinite(amountSar) || amountSar <= 0) {
        throw new Error(`Installment ${index + 1} amount must be positive.`);
      }
      return {
        installmentNumber: index + 1,
        amountSar,
        dueDate: normalizeDate(item.dueDate),
      };
    });

    const scheduleTotal = roundMoney(
      schedule.reduce((sum, item) => sum + item.amountSar, 0),
    );
    if (Math.abs(scheduleTotal - totalAmount) > 0.01) {
      throw new Error("Custom installment total must equal the contract invoice total.");
    }
    return schedule;
  }

  throw new Error("Unsupported payment plan template.");
}

export function serializePaymentSchedule(schedule: PaymentScheduleItem[]) {
  return schedule.map((item) => ({
    installmentNumber: item.installmentNumber,
    amountSar: roundMoney(item.amountSar),
    dueDate: item.dueDate.toISOString(),
  }));
}

export function parsePaymentSchedule(value: unknown): PaymentScheduleItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Payment plan schedule is empty.");
  }

  return value.map((item: any, index) => {
    const amountSar = roundMoney(Number(item?.amountSar));
    const dueDate = new Date(item?.dueDate);
    if (!Number.isFinite(amountSar) || amountSar <= 0 || Number.isNaN(dueDate.getTime())) {
      throw new Error(`Payment plan installment ${index + 1} is invalid.`);
    }
    return {
      installmentNumber: index + 1,
      amountSar,
      dueDate,
    };
  });
}

export async function ensureDefaultPaymentPlanInTx(
  tx: any,
  contract: {
    id: string;
    tenantId: string;
    totalVolumeSar: unknown;
    vatType: string;
    acceptedAt?: Date | null;
    spineVersion?: number;
    legacyFinancial?: boolean;
  },
) {
  if (contract.legacyFinancial || (contract.spineVersion ?? 2) < 2) {
    throw new Error("Legacy contract payment plans are read-only.");
  }

  const existing = await tx.paymentPlan.findUnique({
    where: { contractId: contract.id },
  });
  if (existing) return existing;

  const totalAmount = calculateContractInvoiceTotal(
    Number(contract.totalVolumeSar),
    contract.vatType === "ZERO_RATED" || contract.vatType === "EXEMPT"
      ? contract.vatType
      : "STANDARD",
  );
  const firstDueDate = addDays(
    contract.acceptedAt || new Date(),
    DEFAULT_PAYMENT_DUE_DAYS,
  );
  const schedule = buildPaymentSchedule({
    totalAmount,
    template: PAYMENT_PLAN_TEMPLATE.SINGLE_PAYMENT,
    firstDueDate,
  });

  return tx.paymentPlan.create({
    data: {
      tenantId: contract.tenantId,
      contractId: contract.id,
      template: PAYMENT_PLAN_TEMPLATE.SINGLE_PAYMENT,
      status: PAYMENT_PLAN_STATUS.DRAFT,
      totalAmount,
      installmentCount: schedule.length,
      scheduleJson: serializePaymentSchedule(schedule),
    },
  });
}

export async function ensureDefaultPaymentPlan(input: {
  tenantId: string;
  contractId: string;
  userId?: string | null;
}) {
  await assertTenantOwnership(
    input.tenantId,
    "contract",
    input.contractId,
    "Contract not found in this tenant.",
  );

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId },
    });
    if (!contract) throw new Error("Contract not found.");
    if (contract.legacyFinancial || contract.spineVersion < 2) {
      throw new Error("Legacy contract payment plans are read-only.");
    }
    return ensureDefaultPaymentPlanInTx(tx, contract);
  });
}

export async function configurePaymentPlan(input: ConfigurePaymentPlanInput) {
  const {
    tenantId,
    userId,
    contractId,
    template,
    installmentCount,
    firstDueDate,
    intervalDays,
    depositPercent,
    customInstallments,
  } = input;

  await assertTenantOwnership(
    tenantId,
    "contract",
    contractId,
    "Contract not found in this tenant.",
  );

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        invoices: { where: { type: "SALE" }, select: { id: true } },
      },
    });
    if (!contract) throw new Error("Contract not found.");
    if (contract.legacyFinancial || contract.spineVersion < 2) {
      throw new Error("Legacy contract payment plans are read-only.");
    }
    if (contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE) {
      throw new Error("Payment plan can only be changed before contract signing.");
    }
    if (contract.invoices.length > 0) {
      throw new Error("Payment plan cannot be changed after a sale invoice exists.");
    }

    const totalAmount = calculateContractInvoiceTotal(
      Number(contract.totalVolumeSar),
      contract.vatType === "ZERO_RATED" || contract.vatType === "EXEMPT"
        ? contract.vatType
        : "STANDARD",
    );
    const schedule = buildPaymentSchedule({
      totalAmount,
      template,
      installmentCount,
      firstDueDate,
      intervalDays,
      depositPercent,
      customInstallments,
    });

    const paymentPlan = await tx.paymentPlan.upsert({
      where: { contractId },
      create: {
        tenantId,
        contractId,
        template,
        status: PAYMENT_PLAN_STATUS.DRAFT,
        totalAmount,
        installmentCount: schedule.length,
        scheduleJson: serializePaymentSchedule(schedule),
      },
      update: {
        template,
        status: PAYMENT_PLAN_STATUS.DRAFT,
        totalAmount,
        installmentCount: schedule.length,
        scheduleJson: serializePaymentSchedule(schedule),
        activatedAt: null,
        completedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CONFIGURE_PAYMENT_PLAN",
        tableName: "payment_plans",
        recordId: paymentPlan.id,
        details: JSON.stringify({
          contractId,
          template,
          installmentCount: schedule.length,
          totalAmount,
        }),
      },
    });

    return { paymentPlan, schedule };
  });
}
