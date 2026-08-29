export function getInitials(displayName: string): string | undefined {
  return displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : undefined;
}
