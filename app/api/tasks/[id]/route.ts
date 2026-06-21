export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { progress } = await req.json();
  const sql = getDb();
  const [row] = await sql`UPDATE tasks SET progress = ${progress} WHERE id = ${id} RETURNING *`;
  return Response.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { requester } = await req.json();
  if (requester !== 'Amrit') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = getDb();
  await sql`DELETE FROM tasks WHERE id = ${id}`;
  return Response.json({ ok: true });
}
