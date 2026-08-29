export function getInitials(displayName: string | null | undefined): string | undefined {
  return displayName && displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : undefined;
}
