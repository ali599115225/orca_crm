// app/api/v1/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCRATCH_DIR = path.join(process.cwd(), 'scratch');
const DOCUMENTS_FILE = path.join(SCRATCH_DIR, 'documents.json');

function getDocuments() {
  if (!fs.existsSync(DOCUMENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function saveDocuments(docs: any[]) {
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docs = getDocuments();
    const initialLength = docs.length;
    const filtered = docs.filter((d: any) => d.id !== id);

    if (filtered.length === initialLength) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 444 });
    }

    saveDocuments(filtered);
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
