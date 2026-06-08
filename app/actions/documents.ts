// app/actions/documents.ts
"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const SCRATCH_DIR = path.join(process.cwd(), "scratch");
const DOCUMENTS_FILE = path.join(SCRATCH_DIR, "documents.json");

// التأكد من تهيئة ملف ومجلد المستندات
function getDocumentsList() {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTS_FILE)) {
    const initialDocs = [
      {
        id: "doc-1",
        name: "عقد إيجار موحد - فيلا الياسمين.pdf",
        url: "/mock-documents/ejar-contract.pdf",
        type: "CONTRACT",
        linkedTo: "1",
        linkedType: "PROPERTY",
        size: 1542000,
        createdAt: new Date("2026-05-15").toISOString(),
      },
      {
        id: "doc-2",
        name: "مخطط الدور الأرضي - مشروع فلل النرجس.png",
        url: "/mock-documents/ground-floor.png",
        type: "BLUEPRINT",
        linkedTo: "2",
        linkedType: "PROJECT",
        size: 3420000,
        createdAt: new Date("2026-05-20").toISOString(),
      },
      {
        id: "doc-3",
        name: "بطاقة هوية العميل - محمد القحطاني.jpg",
        url: "/mock-documents/id-card.jpg",
        type: "ID",
        linkedTo: "3",
        linkedType: "LEAD",
        size: 512000,
        createdAt: new Date("2026-06-01").toISOString(),
      },
    ];
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(initialDocs, null, 2));
    return initialDocs;
  }
  try {
    const content = fs.readFileSync(DOCUMENTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

function saveDocumentsList(docs: any[]) {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2));
}

/**
 * جلب جميع المستندات والملفات المرفوعة
 */
export async function getDocumentsAction() {
  try {
    const docs = getDocumentsList();
    return { success: true, data: docs };
  } catch (error: any) {
    console.error("فشل جلب المستندات:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * إدراج مستند جديد وحفظه في المستودع مع رفع الملف الفعلي
 */
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
    const { name, type, linkedTo, linkedType, size, url, fileContent } = data;
    const docId = `doc-${Date.now()}`;
    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uploadsDir = path.join(SCRATCH_DIR, "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileUrl = url || `/mock-documents/${docId}-${safeName}`;

    if (fileContent) {
      const base64Data = fileContent.includes(",") ? fileContent.split(",")[1] : fileContent;
      const filePath = path.join(uploadsDir, `${docId}-${safeName}`);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      fileUrl = `/scratch/uploads/${docId}-${safeName}`;
    }

    const newDoc = {
      id: docId,
      name,
      url: fileUrl,
      type,
      linkedTo: linkedTo || null,
      linkedType: linkedType || null,
      size: size || 102400,
      createdAt: new Date().toISOString(),
    };

    const docs = getDocumentsList();
    docs.unshift(newDoc);
    saveDocumentsList(docs);

    revalidatePath("/operations/documents");
    return { success: true, data: newDoc };
  } catch (error: any) {
    console.error("Failed to create document:", error);
    return { success: false, error: error.message };
  }
}

/**
 * حذف مستند من المستودع بواسطة المعرّف
 */
export async function deleteDocumentActionDirect(id: string) {
  try {
    const docs = getDocumentsList();
    const initialLength = docs.length;
    const filtered = docs.filter((d: any) => d.id !== id);

    if (filtered.length === initialLength) {
      throw new Error("المستند المطلوب غير موجود في النظام.");
    }

    saveDocumentsList(filtered);
    revalidatePath("/operations/documents");
    return { success: true, message: "تم حذف المستند بنجاح." };
  } catch (error: any) {
    console.error("فشل حذف المستند:", error);
    return { success: false, error: error.message };
  }
}
