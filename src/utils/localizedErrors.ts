import { translate } from '../i18n'

export function translateError(key: string, values?: Record<string, unknown>): string {
  return translate(`errors.${key}`, values)
}
