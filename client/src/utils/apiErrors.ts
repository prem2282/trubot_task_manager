export type FieldErrors = Record<string, string>;

export interface ParsedApiError {
  message: string;
  fieldErrors: FieldErrors;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  password: 'Password',
  accountName: 'Account name',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function parseApiError(err: unknown, fallback = 'Request failed'): ParsedApiError {
  const data = (
    err as {
      response?: { data?: { message?: string; errors?: { field: string; message: string }[] } };
    }
  )?.response?.data;

  const fieldErrors: FieldErrors = {};
  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      if (item.field) {
        fieldErrors[item.field] = item.message;
      }
    }
  }

  return {
    message: data?.message ?? fallback,
    fieldErrors,
  };
}

export function formatApiError(parsed: ParsedApiError): string {
  const details = Object.entries(parsed.fieldErrors).map(
    ([field, message]) => `${fieldLabel(field)}: ${message}`
  );

  if (details.length > 0) {
    return details.join(' · ');
  }

  return parsed.message;
}
