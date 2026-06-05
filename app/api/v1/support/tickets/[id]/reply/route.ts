// app/api/v1/support/tickets/[id]/reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCRATCH_DIR = path.join(process.cwd(), 'scratch');
const REPLIES_FILE = path.join(SCRATCH_DIR, 'ticket_replies.json');

function getReplies() {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPLIES_FILE)) {
    fs.writeFileSync(REPLIES_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(REPLIES_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

function saveReplies(replies: Record<string, any[]>) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify(replies, null, 2));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allReplies = getReplies();
    const ticketReplies = allReplies[id] || [];
    return NextResponse.json({ success: true, data: ticketReplies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, sender } = body; // sender: 'CLIENT' or 'SUPPORT' or 'AI'

    if (!message || !sender) {
      return NextResponse.json({ success: false, error: 'Message and sender are required' }, { status: 400 });
    }

    const newReply = {
      id: `reply-${Date.now()}`,
      message,
      sender,
      createdAt: new Date().toISOString()
    };

    const allReplies = getReplies();
    if (!allReplies[id]) {
      allReplies[id] = [];
    }
    allReplies[id].push(newReply);
    saveReplies(allReplies);

    return NextResponse.json({ success: true, data: newReply });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
