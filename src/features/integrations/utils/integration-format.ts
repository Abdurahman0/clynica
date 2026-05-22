// @ts-nocheck


import type {
  IntegrationPlatform,
  IntegrationProvider,
} from '../../../types/domain';
import { formatLocalizedDate } from '../../../i18n/date-format';

export function getIntegrationProviderLabel(provider: IntegrationProvider): string {
  if (provider === 'telegram') {
    return 'Telegram';
  }

  if (provider === 'instagram') {
    return 'Instagram';
  }

  return 'OpenAI';
}

export function getIntegrationPlatformLabel(platform: IntegrationPlatform): string {
  if (platform === 'telegram') {
    return 'Telegram';
  }

  if (platform === 'instagram') {
    return 'Instagram';
  }

  if (platform === 'userbot') {
    return 'Userbot';
  }

  return "To'lov";
}

export function getIntegrationProviderClassName(provider: IntegrationProvider): string {
  if (provider === 'telegram') {
    return 'bg-[rgb(32_156_238_/_0.14)] text-[rgb(12_114_181)]';
  }

  if (provider === 'instagram') {
    return 'bg-[rgb(231_66_133_/_0.15)] text-[rgb(176_35_96)]';
  }

  return 'bg-info-bg text-info';
}

export function getIntegrationPlatformClassName(platform: IntegrationPlatform): string {
  if (platform === 'telegram') {
    return 'bg-[rgb(32_156_238_/_0.14)] text-[rgb(12_114_181)]';
  }

  if (platform === 'instagram') {
    return 'bg-[rgb(231_66_133_/_0.15)] text-[rgb(176_35_96)]';
  }

  if (platform === 'userbot') {
    return 'bg-neutral-bg text-neutral';
  }

  return 'bg-warning-bg text-warning';
}

export function getProcessedLabel(processed: boolean): string {
  return processed ? 'Qayta ishlangan' : 'Kutilmoqda';
}

export function formatIntegrationDateTime(
  timestamp: string | undefined,
  language: string,
  locale: string,
  fallback = '',
): string {
  return formatLocalizedDate(timestamp, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback,
  });
}

export function maskSecretValue(value: string): string {
  if (!value) {
    return '';
  }

  return '********';
}

