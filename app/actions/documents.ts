// app/actions/documents.ts
"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

const SCRATCH_DIR = path.join(process.cwd(), "scratch");

export async function getDocumentsAction() {
  try {
    const tenant = await getActiveTenant();
    const prismaAny = prisma as any;
    const docs = await prismaAny.document.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: docs, source: "prisma" };
  } catch (error: any) {
    console.error("فشل جلب المستندات:", error);
    return { success: false, error: error.message, data: [], source: "prisma" };
  }
}

export async function createDocumentActionDirect(data: {
  name: string;
  type: string;
  linkedTo?: string | null;
  linkedType?: string | null;
  size?: number;
  url?: string;
  fileContent?: string;
}) {
  try {
    const tenant = await getActiveTenant();
    const { name, type, linkedTo, linkedType, size, url, fileContent } = data;
    const docId = `doc-${Date.now()}`;
    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"];
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { success: false, error: "نوع الملف غير مسموح به" };
    }
    if (size && size > 10 * 1024 * 1024) {
      return { success: false, error: "حجم الملف يتجاوز 10 ميجابايت" };
    }
    if (safeName.includes("..") || safeName.includes("~") || safeName.includes("/") || safeName.includes("\\")) {
      return { success: false, error: "اسم ملف غير صالح" };
    }

    let fileUrl = url || `/mock-documents/${docId}-${safeName}`;

    if (fileContent) {
      const uploadsDir = path.join(SCRATCH_DIR, "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const base64Data = fileContent.includes(",") ? fileContent.split(",")[1] : fileContent;
      const filePath = path.join(uploadsDir, `${docId}-${safeName}`);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      fileUrl = `/scratch/uploads/${docId}-${safeName}`;
    }

    const prismaAny = prisma as any;
    const document = await prismaAny.document.create({
      data: {
        tenantId: tenant.id,
        name,
        url: fileUrl,
        type,
        linkedTo: linkedTo || null,
        linkedType: linkedType || null,
        size: size || 102400,
      },
    });

    revalidatePath("/operations/documents");
    return { success: true, data: document, source: "prisma" };
  } catch (error: any) {
    console.error("Failed to create document:", error);
    if (error.code === "P2025") {
      return { success: false, error: "تعذر إنشاء المستند — قاعدة البيانات غير متاحة" };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteDocumentActionDirect(id: string) {
  try {
    const tenant = await getActiveTenant();
    const prismaAny = prisma as any;

    const existing = await prismaAny.document.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new Error("المستند المطلوب غير موجود في النظام.");
    }

    await prismaAny.document.delete({ where: { id } });

    revalidatePath("/operations/documents");
    return { success: true, message: "تم حذف المستند بنجاح.", source: "prisma" };
  } catch (error: any) {
    console.error("فشل حذف المستند:", error);
    return { success: false, error: error.message };
  }
}
