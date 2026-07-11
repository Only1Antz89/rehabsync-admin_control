export type ClientSubscriptionTierId = 'essential' | 'plus' | 'sports';

export interface ClientSubscriptionTier {
  id: ClientSubscriptionTierId;
  name: string;
  pricePence: number;
  summary: string;
  audience: string;
  benefits: string[];
  accent: 'slate' | 'teal' | 'emerald';
  imageSrc?: string;
  featured?: boolean;
}

export const CLIENT_SUBSCRIPTION_TIERS: ClientSubscriptionTier[] = [
  {
    id: 'essential',
    name: 'Essential',
    pricePence: 0,
    summary: 'Base access for staying connected with your consultant when they are online.',
    audience: 'For clients who need straightforward consultant-led rehab support.',
    benefits: ['Chat to your consultant when online', 'Rehab resources shared by your clinic', 'Plan progress in your member dashboard'],
    accent: 'slate',
  },
  {
    id: 'plus',
    name: 'Plus',
    pricePence: 1999,
    summary: 'Activates AI features that can support better care between appointments.',
    audience: 'For clients who want guided support and smarter rehab prompts between sessions.',
    benefits: ['AI consultant', 'Rehab journey guidance', 'Suggested resources', 'Device connectivity for AI monitoring'],
    accent: 'teal',
    imageSrc: '/subscriptions/plus-ai-care.png',
    featured: true,
  },
  {
    id: 'sports',
    name: 'Sports',
    pricePence: 7999,
    summary: 'Premium AI support to monitor recovery and guide you back to top fitness.',
    audience: 'For athletes and highly active clients returning to sport or peak performance.',
    benefits: [
      'Wellness recovery tracking',
      'Rehab journey guidance',
      'AI consultant',
      'Triage access',
      'Suggested resources',
      'Device connectivity for AI monitoring',
    ],
    accent: 'emerald',
    imageSrc: '/subscriptions/sports-ai-recovery.png',
  },
];

export function formatClientSubscriptionPrice(pricePence: number): string {
  if (pricePence === 0) return 'Included';
  return `£${(pricePence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
