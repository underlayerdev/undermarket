import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { withPendingOperations } from './with-pending-operations';

const TestStore = signalStore(withPendingOperations<'save' | 'delete'>());

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('withPendingOperations', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [TestStore] });
    return TestBed.inject(TestStore);
  }

  it('should mark an operation pending only while it runs', async () => {
    const store = setup();
    const save = deferred<string>();

    const result = store.track('save', () => save.promise);
    expect(store.isPending('save')).toBe(true);
    expect(store.isPending('delete')).toBe(false);

    save.resolve('done');
    await expect(result).resolves.toBe('done');
    expect(store.isPending('save')).toBe(false);
  });

  it('should clear the operation and rethrow when it fails', async () => {
    const store = setup();

    await expect(
      store.track('save', () => Promise.reject(new Error('network down'))),
    ).rejects.toThrow('network down');
    expect(store.isPending('save')).toBe(false);
  });

  it('should keep an operation pending until its last concurrent run settles', async () => {
    const store = setup();
    const first = deferred();
    const second = deferred();

    const firstRun = store.track('save', () => first.promise);
    const secondRun = store.track('save', () => second.promise);

    first.resolve();
    await firstRun;
    expect(store.isPending('save')).toBe(true);

    second.resolve();
    await secondRun;
    expect(store.isPending('save')).toBe(false);
  });
});
