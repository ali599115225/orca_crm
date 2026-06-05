// app/api/v1/settings/api-keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCRATCH_DIR = path.join(process.cwd(), 'scratch');
const KEYS_FILE = path.join(SCRATCH_DIR, 'api_keys.json');

function getApiKeys() {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEYS_FILE)) {
    const initialKeys = [
      {
        id: 'key-1',
        name: 'كود دمج ووردبريس لموقع المبيعات',
        key: 'orca_live_sk_78129837a283b918',
        createdAt: new Date('2026-04-10').toISOString()
      },
      {
        id: 'key-2',
        name: 'قناة أتمتة مهام ريتمينز رابيد',
        key: 'orca_live_sk_91823791a823b129',
        createdAt: new Date('2026-05-18').toISOString()
      }
    ];
    fs.writeFileSync(KEYS_FILE, JSON.stringify(initialKeys, null, 2));
    return initialKeys;
  }
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function saveApiKeys(keys: any[]) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const keys = getApiKeys();
    return NextResponse.json({ success: true, data: keys });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = {
      id: `key-${Date.now()}`,
      name,
      key: `orca_live_sk_${randomHex}`,
      createdAt: new Date().toISOString()
    };

    const keys = getApiKeys();
    keys.unshift(newKey);
    saveApiKeys(keys);

    return NextResponse.json({ success: true, data: newKey });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const keys = getApiKeys();
    const filtered = keys.filter((k: any) => k.id !== id);
    saveApiKeys(filtered);

    return NextResponse.json({ success: true, message: 'Key deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
