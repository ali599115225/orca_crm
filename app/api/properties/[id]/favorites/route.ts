// app/api/properties/[id]/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory store (replace with Prisma UserFavorite model in production)
const favoritesStore: Record<string, Set<string>> = {};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب.' },
        { status: 400 }
      );
    }

    if (!favoritesStore[userId]) {
      favoritesStore[userId] = new Set();
    }

    const isFav = favoritesStore[userId].has(id);
    if (isFav) {
      favoritesStore[userId].delete(id);
    } else {
      favoritesStore[userId].add(id);
    }

    return NextResponse.json({
      success: true,
      propertyId: id,
      isFavorite: !isFav,
      message: !isFav ? 'تمت الإضافة إلى المفضلة.' : 'تمت الإزالة من المفضلة.'
    });

  } catch (err) {
    console.error('[favorites] error:', err);
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي.' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ isFavorite: false });
  }

  const isFavorite = favoritesStore[userId]?.has(id) ?? false;
  return NextResponse.json({ propertyId: id, userId, isFavorite });
}
