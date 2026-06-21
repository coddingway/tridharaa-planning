export const dynamic = 'force-dynamic';
import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  const rows = await sql`SELECT * FROM tasks ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const { idea_id, title, assigned_to } = await req.json();
  if (!title) return Response.json({ error: 'Missing title' }, { status: 400 });
  const [row] = await sql`
    INSERT INTO tasks (idea_id, title, assigned_to)
    VALUES (${idea_id ?? null}, ${title}, ${assigned_to ?? null})
    RETURNING *
  `;
  return Response.json(row, { status: 201 });
}
