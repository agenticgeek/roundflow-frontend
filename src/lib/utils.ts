import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names and de-duplicate conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Format a numeric amount as currency. */
export function formatCurrency(amount: number, currency = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

/** Replace `{{variable}}` placeholders in a message template. */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`)
}

/** Truncate template body for list previews. */
export function truncateTemplateBody(body: string, maxLength = 55): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > maxLength ? flat.slice(0, maxLength) : flat
}
