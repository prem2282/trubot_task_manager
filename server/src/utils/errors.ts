export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}
