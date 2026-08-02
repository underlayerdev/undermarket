import { MockNotificationProvider } from './mock-notification.provider';

describe('MockNotificationProvider', () => {
  it('should emit the seeded notifications immediately on observe', () => {
    const provider = new MockNotificationProvider();
    const callback = vi.fn();

    provider.observe(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('should notify subscribers after markAsRead', async () => {
    const provider = new MockNotificationProvider();
    const callback = vi.fn();
    provider.observe(callback);
    const [first] = callback.mock.calls[0][0];

    await provider.markAsRead(first.id);

    expect(callback).toHaveBeenCalledTimes(2);
    const updated = callback.mock.calls[1][0].find((n: { id: string }) => n.id === first.id);
    expect(updated.read).toBe(true);
  });

  it('should mark every notification as read after markAllAsRead', async () => {
    const provider = new MockNotificationProvider();
    const callback = vi.fn();
    provider.observe(callback);

    await provider.markAllAsRead();

    const latest = callback.mock.calls[callback.mock.calls.length - 1][0];
    expect(latest.every((n: { read: boolean }) => n.read)).toBe(true);
  });

  it('should stop notifying a listener after it unsubscribes', async () => {
    const provider = new MockNotificationProvider();
    const callback = vi.fn();
    const unsubscribe = provider.observe(callback);
    callback.mockClear();

    unsubscribe();
    await provider.markAllAsRead();

    expect(callback).not.toHaveBeenCalled();
  });
});
