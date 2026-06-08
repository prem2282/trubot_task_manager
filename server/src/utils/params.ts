export function param(value: string | string[] | undefined, name = 'parameter'): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  throw new Error(`Missing ${name}`);
}
