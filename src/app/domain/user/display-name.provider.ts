export interface ChangeDisplayNameResult {
  displayName: string;
}

/**
 * Talks to the changeDisplayName Cloud Function — the only way a display
 * name changes, since its format needs server-side checks that Firestore
 * rules can't express (see firestore.rules). Resolves with the normalized
 * name that was stored, which can differ from what was sent.
 *
 * Rejects with code `user/display-name-invalid` when the server refuses the
 * name; any other failure keeps its own code.
 */
export interface DisplayNameProvider {
  change(displayName: string): Promise<ChangeDisplayNameResult>;
}
