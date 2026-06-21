export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SECRET_KEY   = process.env.SUPABASE_SECRET_KEY!;
const BUCKET       = 'idea-images';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });

  const ext      = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes    = await file.arrayBuffer();

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      'apikey':        SECRET_KEY,
      'Authorization': `Bearer ${SECRET_KEY}`,
      'Content-Type':  file.type,
      'x-upsert':      'true',
    },
    body: bytes,
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err }, { status: 500 });
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  return Response.json({ url });
}
