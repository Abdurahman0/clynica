import type { SelectOption } from '../types/common';
import type { PlatformChannel } from '../types/common';

export const PLATFORM_CHANNELS = [
  'manual',
  'telegram',
  'instagram',
  'web',
  'whatsapp',
  'facebook',
  'website',
  'marketplace',
  'webchat',
  'referral',
  'other',
] as const satisfies readonly PlatformChannel[];

export const PLATFORM_CHANNEL_LABELS: Record<PlatformChannel, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  manual: 'Manual',
  web: 'Web',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  website: 'Website',
  marketplace: 'Marketplace',
  webchat: 'Web Chat',
  referral: 'Referral',
  other: 'Other',
};

export const PLATFORM_CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'manual', label: PLATFORM_CHANNEL_LABELS.manual },
  { value: 'telegram', label: PLATFORM_CHANNEL_LABELS.telegram },
  { value: 'instagram', label: PLATFORM_CHANNEL_LABELS.instagram },
  { value: 'web', label: PLATFORM_CHANNEL_LABELS.web },
  { value: 'whatsapp', label: PLATFORM_CHANNEL_LABELS.whatsapp },
  { value: 'facebook', label: PLATFORM_CHANNEL_LABELS.facebook },
  { value: 'website', label: PLATFORM_CHANNEL_LABELS.website },
  { value: 'marketplace', label: PLATFORM_CHANNEL_LABELS.marketplace },
  { value: 'webchat', label: PLATFORM_CHANNEL_LABELS.webchat },
  { value: 'referral', label: PLATFORM_CHANNEL_LABELS.referral },
  { value: 'other', label: PLATFORM_CHANNEL_LABELS.other },
];
