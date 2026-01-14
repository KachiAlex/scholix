import { prisma } from '@/lib/prisma';
import { DEFAULT_PLATFORM_PLANS, type PlatformPlanSeed } from './platform-plan-defaults';

export type PlatformPlanRecord = {
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  seatPrice: number;
  billingInterval: string;
  minSeats: number;
  discountPercent: number | null;
  discountLabel: string | null;
  features: string[];
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

const ORDER_BY_MIN_SEATS = { minSeats: 'asc' as const };

function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : null))
      .filter((item): item is string => Boolean(item && item.trim()))
      .map((item) => item.trim());
  }
  return [];
}

export function normalizePlatformPlan(raw: any): PlatformPlanRecord {
  return {
    slug: String(raw?.slug ?? ''),
    name: String(raw?.name ?? ''),
    description: raw?.description ? String(raw.description) : null,
    currency: raw?.currency ? String(raw.currency) : 'NGN',
    seatPrice: typeof raw?.seatPrice === 'number' ? raw.seatPrice : 0,
    billingInterval: raw?.billingInterval ? String(raw.billingInterval) : 'student/month',
    minSeats: typeof raw?.minSeats === 'number' ? raw.minSeats : 0,
    discountPercent: typeof raw?.discountPercent === 'number' ? raw.discountPercent : null,
    discountLabel: raw?.discountLabel ? String(raw.discountLabel) : null,
    features: normalizeFeatures(raw?.features),
    isFeatured: Boolean(raw?.isFeatured),
    createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : new Date(0).toISOString(),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date(0).toISOString(),
  };
}

function mapSeedToCreateData(seed: PlatformPlanSeed) {
  return {
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    currency: seed.currency,
    seatPrice: seed.seatPrice,
    billingInterval: seed.billingInterval,
    minSeats: seed.minSeats,
    discountPercent: seed.discountPercent,
    discountLabel: seed.discountLabel,
    features: seed.features,
    isFeatured: seed.isFeatured ?? false,
  };
}

export async function ensurePlatformPlansSeeded() {
  const count = await prisma.platformPlan.count();
  if (count === 0) {
    await prisma.platformPlan.createMany({
      data: DEFAULT_PLATFORM_PLANS.map(mapSeedToCreateData),
    });
  }
}

export async function listPlatformPlans() {
  await ensurePlatformPlansSeeded();
  const rows = await prisma.platformPlan.findMany({
    orderBy: ORDER_BY_MIN_SEATS,
  });
  return rows.map(normalizePlatformPlan);
}

type PlanUpsertPayload = {
  slug?: string;
  name?: string;
  description?: string | null;
  currency?: string;
  seatPrice?: number;
  billingInterval?: string;
  minSeats?: number;
  discountPercent?: number | null;
  discountLabel?: string | null;
  features?: string[];
  isFeatured?: boolean;
};

function sanitizeSlug(value: string) {
  const trimmed = value.toLowerCase().trim();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'plan-' + Date.now().toString();
}

function sanitizeCurrency(value?: string) {
  if (!value) return 'NGN';
  return value.trim().toUpperCase();
}

function sanitizeBillingInterval(value?: string) {
  if (!value) return 'student/month';
  return value.trim();
}

function sanitizeFeatures(features?: string[]) {
  if (!features) return [];
  return features
    .map((text) => (typeof text === 'string' ? text.trim() : ''))
    .filter((text) => Boolean(text));
}

function coerceNumber(value: unknown, { min, allowZero }: { min?: number; allowZero?: boolean } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const int = Math.round(value);
  if (allowZero && int === 0) return 0;
  if (min !== undefined && int < min) {
    return null;
  }
  return int;
}

function validateDiscount(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const int = Math.round(value);
  if (int < 0 || int > 100) return null;
  return int;
}

function assertField<T>(value: T | null, message: string): T {
  if (value === null || value === undefined || value === ('' as unknown as T)) {
    throw new Error(`BAD_REQUEST: ${message}`);
  }
  return value;
}

function buildPlanData(payload: PlanUpsertPayload, { isCreate = false }: { isCreate?: boolean } = {}) {
  const data: Record<string, any> = {};

  if (payload.slug || isCreate) {
    const targetSlug = payload.slug ?? payload.name ?? '';
    if (!targetSlug || typeof targetSlug !== 'string') {
      throw new Error('BAD_REQUEST: slug or name is required');
    }
    data.slug = sanitizeSlug(targetSlug);
  }

  if (payload.name !== undefined || isCreate) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    data.name = assertField(name || (payload.slug as string) || '', 'name is required');
  }

  if (payload.description !== undefined) {
    data.description = payload.description ? payload.description.trim() : null;
  }

  if (payload.currency !== undefined || isCreate) {
    data.currency = sanitizeCurrency(payload.currency);
  }

  if (payload.seatPrice !== undefined || isCreate) {
    const seatPrice = coerceNumber(payload.seatPrice, { min: 1 });
    data.seatPrice = assertField(seatPrice, 'seatPrice must be a positive integer');
  }

  if (payload.billingInterval !== undefined || isCreate) {
    data.billingInterval = sanitizeBillingInterval(payload.billingInterval);
  }

  if (payload.minSeats !== undefined || isCreate) {
    const minSeats = coerceNumber(payload.minSeats, { min: 1 });
    data.minSeats = assertField(minSeats, 'minSeats must be a positive integer');
  }

  if (payload.discountPercent !== undefined) {
    data.discountPercent = validateDiscount(payload.discountPercent);
  }

  if (payload.discountLabel !== undefined) {
    data.discountLabel = payload.discountLabel ? payload.discountLabel.trim() : null;
  }

  if (payload.features !== undefined) {
    data.features = sanitizeFeatures(payload.features);
  }

  if (payload.isFeatured !== undefined) {
    data.isFeatured = Boolean(payload.isFeatured);
  }

  return data;
}

export async function createPlatformPlan(payload: PlanUpsertPayload) {
  const data = buildPlanData(payload, { isCreate: true });
  const plan = await prisma.platformPlan.create({
    data,
  });
  return normalizePlatformPlan(plan);
}

export async function updatePlatformPlan(slug: string, payload: PlanUpsertPayload) {
  const data = buildPlanData(payload);
  if (Object.keys(data).length === 0) {
    throw new Error('BAD_REQUEST: no updates provided');
  }
  const plan = await prisma.platformPlan.update({
    where: { slug },
    data,
  });
  return normalizePlatformPlan(plan);
}

export async function deletePlatformPlan(slug: string) {
  await prisma.platformPlan.delete({
    where: { slug },
  });
}

export async function getPlatformPlan(slug: string) {
  const plan = await prisma.platformPlan.findUnique({
    where: { slug },
  });
  if (!plan) {
    throw new Error('NOT_FOUND');
  }
  return normalizePlatformPlan(plan);
}
