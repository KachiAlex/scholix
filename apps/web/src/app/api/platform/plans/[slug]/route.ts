import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import {
  deletePlatformPlan,
  getPlatformPlan,
  updatePlatformPlan,
  type PlatformPlanRecord,
} from '@/lib/platform-plans-server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
  try {
    const plan = await getPlatformPlan(ctx.params.slug);
    return NextResponse.json(plan);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { slug: string } }) {
  try {
    requireSuperadmin(req);
    const body = (await req.json().catch(() => null)) as Partial<PlatformPlanRecord> | null;
    if (!body || typeof body !== 'object') {
      throw new Error('BAD_REQUEST: invalid payload');
    }
    const plan = await updatePlatformPlan(ctx.params.slug, {
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      currency: typeof body.currency === 'string' ? body.currency : undefined,
      seatPrice: typeof body.seatPrice === 'number' ? body.seatPrice : undefined,
      billingInterval: typeof body.billingInterval === 'string' ? body.billingInterval : undefined,
      minSeats: typeof body.minSeats === 'number' ? body.minSeats : undefined,
      discountPercent:
        typeof body.discountPercent === 'number' || body.discountPercent === null ? body.discountPercent : undefined,
      discountLabel: typeof body.discountLabel === 'string' ? body.discountLabel : undefined,
      features: Array.isArray(body.features) ? (body.features as string[]) : undefined,
      isFeatured: typeof body.isFeatured === 'boolean' ? body.isFeatured : undefined,
    });
    return NextResponse.json(plan);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { slug: string } }) {
  try {
    requireSuperadmin(req);
    await deletePlatformPlan(ctx.params.slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
