export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ideas ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const { member_name, idea_text, category } = await req.json();
  if (!member_name || !idea_text || !category)
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO ideas (member_name, idea_text, category)
    VALUES (${member_name}, ${idea_text}, ${category})
    RETURNING *
  `;
  return Response.json(row, { status: 201 });
}
