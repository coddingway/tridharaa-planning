export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  const sql = getDb();
  const [row] = await sql`UPDATE ideas SET status = ${status} WHERE id = ${id} RETURNING *`;
  return Response.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { requester } = await req.json();
  const sql = getDb();
  const [idea] = await sql`SELECT member_name FROM ideas WHERE id = ${id}`;
  if (!idea) return Response.json({ error: 'Not found' }, { status: 404 });
  if (requester !== 'Amrit' && requester !== idea.member_name)
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  await sql`DELETE FROM ideas WHERE id = ${id}`;
  return Response.json({ ok: true });
}
