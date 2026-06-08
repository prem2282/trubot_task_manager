export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

export function confirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (!passwordsMatch(password, confirmPassword)) {
    return 'Passwords do not match';
  }
  return null;
}

export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
