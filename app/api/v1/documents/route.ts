// app/api/v1/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCRATCH_DIR = path.join(process.cwd(), 'scratch');
const DOCUMENTS_FILE = path.join(SCRATCH_DIR, 'documents.json');

// Ensure scratch directory and documents file exist
function getDocuments() {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTS_FILE)) {
    const initialDocs = [
      {
        id: 'doc-1',
        name: 'عقد إيجار موحد - فيلا الياسمين.pdf',
        url: '/mock-documents/ejar-contract.pdf',
        type: 'CONTRACT',
        linkedTo: '1',
        linkedType: 'PROPERTY',
        size: 1542000,
        createdAt: new Date('2026-05-15').toISOString()
      },
      {
        id: 'doc-2',
        name: 'مخطط الدور الأرضي - مشروع فلل النرجس.png',
        url: '/mock-documents/ground-floor.png',
        type: 'BLUEPRINT',
        linkedTo: '2',
        linkedType: 'PROJECT',
        size: 3420000,
        createdAt: new Date('2026-05-20').toISOString()
      },
      {
        id: 'doc-3',
        name: 'بطاقة هوية العميل - محمد القحطاني.jpg',
        url: '/mock-documents/id-card.jpg',
        type: 'ID',
        linkedTo: '3',
        linkedType: 'LEAD',
        size: 512000,
        createdAt: new Date('2026-06-01').toISOString()
      }
    ];
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(initialDocs, null, 2));
    return initialDocs;
  }
  try {
    const content = fs.readFileSync(DOCUMENTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

function saveDocuments(docs: any[]) {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const docs = getDocuments();
    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string || (file ? file.name : 'document.pdf');
    const type = formData.get('type') as string || 'OTHER';
    const linkedTo = formData.get('linkedTo') as string || null;
    const linkedType = formData.get('linkedType') as string || null;

    if (!file && !formData.get('url')) {
      return NextResponse.json({ success: false, error: 'File or URL is required' }, { status: 400 });
    }

    const size = file ? file.size : 1024 * 102; // Mock size if no file
    const docId = `doc-${Date.now()}`;
    
    // Simulate file storage
    // In production we upload to S3/Vercel Blob, here we simulate a mock URL
    const fileUrl = `/mock-documents/${docId}-${name}`;

    const newDoc = {
      id: docId,
      name,
      url: fileUrl,
      type,
      linkedTo,
      linkedType,
      size,
      createdAt: new Date().toISOString()
    };

    const docs = getDocuments();
    docs.unshift(newDoc);
    saveDocuments(docs);

    return NextResponse.json({ success: true, data: newDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
