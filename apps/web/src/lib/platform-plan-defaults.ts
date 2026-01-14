export type PlatformPlanSeed = {
  slug: string;
  name: string;
  description: string;
  currency: string;
  seatPrice: number;
  billingInterval: string;
  minSeats: number;
  discountPercent: number | null;
  discountLabel: string | null;
  features: string[];
  isFeatured?: boolean;
};

export const DEFAULT_PLATFORM_PLANS: PlatformPlanSeed[] = [
  {
    slug: 'launch',
    name: 'Launch',
    description: 'Pilot Scholix with SIS Core and baseline support for up to 1k students.',
    currency: 'NGN',
    seatPrice: 850,
    billingInterval: 'student/month',
    minSeats: 500,
    discountPercent: null,
    discountLabel: null,
    features: ['SIS Core', 'Email support', '1 audit report / term'],
  },
  {
    slug: 'growth',
    name: 'Growth',
    description: 'Add CBT exams with higher support SLAs for scaling schools.',
    currency: 'NGN',
    seatPrice: 1200,
    billingInterval: 'student/month',
    minSeats: 1500,
    discountPercent: 10,
    discountLabel: 'Annual prepay',
    features: ['SIS Core + CBT', 'Priority chat', 'Automation rules (beta)'],
    isFeatured: true,
  },
  {
    slug: 'scale',
    name: 'Scale',
    description: 'Full bundle with results engine, analytics, and 24/7 escalation.',
    currency: 'NGN',
    seatPrice: 1800,
    billingInterval: 'student/month',
    minSeats: 5000,
    discountPercent: 15,
    discountLabel: 'Multi-year',
    features: ['Results engine', 'Advanced analytics', 'Dedicated CSM'],
  },
];
