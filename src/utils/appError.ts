export class AppError extends Error {
  constructor(
    readonly translationKey: string,
    readonly values: Record<string, unknown> = {},
  ) {
    super(translationKey)
    this.name = 'AppError'
  }
}

export function appError(key: string, values?: Record<string, unknown>) {
  return new AppError(`errors.${key}`, values)
}

export function localizedErrorMessage(
  error: unknown,
  translate: (key: string, values?: Record<string, unknown>) => string,
): string | null {
  if (!(error instanceof AppError)) return null
  const values = { ...error.values }
  if (typeof values.fieldKey === 'string') {
    values.field = translate(values.fieldKey)
    delete values.fieldKey
  }
  return translate(error.translationKey, values)
}
