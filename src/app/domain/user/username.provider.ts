export interface ClaimUsernameResult {
  username: string;
  usernameChangedAt: Date;
}

/**
 * Talks to the claimUsername Cloud Function — the only way a handle ever
 * changes, since uniqueness needs a server-side transaction over the
 * `usernames` index that a client write can't be trusted with.
 *
 * Rejects with the callable's error code: `functions/already-exists` (taken),
 * `functions/invalid-argument` (format/reserved), or
 * `functions/failed-precondition` (still in the change cooldown).
 */
export interface UsernameProvider {
  claim(username: string): Promise<ClaimUsernameResult>;
}
