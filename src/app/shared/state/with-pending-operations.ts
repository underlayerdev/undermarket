import { patchState, signalStoreFeature, withMethods, withState } from '@ngrx/signals';

export interface PendingOperationsState<Operation extends string> {
  pendingOperations: Operation[];
}

/**
 * Tracks which of a store's async commands are in flight, so stores don't
 * each hand-roll an `_isXing` signal + try/finally per command. Duplicates are
 * kept on purpose: two concurrent runs of the same operation keep it pending
 * until the *last* one settles, not the first.
 *
 * `isPending(op)` reads state directly, so it's reactive wherever it's called
 * (template, computed). Stores still expose named computeds
 * (`isPublishing`, ...) as their public API — this is the mechanism, not
 * something components should reach for by operation name.
 */
export function withPendingOperations<Operation extends string>() {
  return signalStoreFeature(
    withState<PendingOperationsState<Operation>>({ pendingOperations: [] }),
    withMethods((store) => ({
      isPending(operation: Operation): boolean {
        return store.pendingOperations().includes(operation);
      },
      /** Marks `operation` pending for the duration of `run`, then rethrows any failure. */
      async track<T>(operation: Operation, run: () => Promise<T>): Promise<T> {
        patchState(store, (state) => ({
          pendingOperations: [...state.pendingOperations, operation],
        }));
        try {
          return await run();
        } finally {
          patchState(store, (state) => {
            const index = state.pendingOperations.indexOf(operation);
            return {
              pendingOperations: state.pendingOperations.filter((_, i) => i !== index),
            };
          });
        }
      },
    })),
  );
}
