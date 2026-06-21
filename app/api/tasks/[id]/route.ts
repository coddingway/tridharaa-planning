export const dynamic = 'force-dynamic';
import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { progress } = await req.json();
  const [row] = await sql`UPDATE tasks SET progress = ${progress} WHERE id = ${id} RETURNING *`;
  return Response.json(row);
}
