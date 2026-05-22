// @ts-nocheck


import type { LogType } from '../../../types/domain';

export function getLogTypeLabel(type: LogType): string {
  if (type === 'ai') {
    return 'AI';
  }

  if (type === 'webhook') {
    return 'Webhook';
  }

  if (type === 'error') {
    return 'Xatolik';
  }

  if (type === 'payment') {
    return "To'lov";
  }

  return 'Tizim';
}

export function getLogTypeTone(
  type: LogType,
): 'info' | 'warning' | 'danger' | 'success' | 'neutral' | 'accent' {
  if (type === 'ai') {
    return 'info';
  }

  if (type === 'webhook') {
    return 'accent';
  }

  if (type === 'error') {
    return 'danger';
  }

  if (type === 'payment') {
    return 'success';
  }

  return 'neutral';
}

