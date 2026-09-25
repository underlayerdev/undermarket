import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup(): ShareService {
    TestBed.configureTestingModule({});
    return TestBed.inject(ShareService);
  }

  it('should share via the Web Share API when available', async () => {
    const shareSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, share: shareSpy });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(shareSpy).toHaveBeenCalledWith({ title: 'A nice chair', url: 'https://example.com/1' });
    expect(result).toBe('shared');
  });

  it('should report cancellation without falling back to the clipboard', async () => {
    const shareSpy = vi.fn(async () => {
      throw new DOMException('Share canceled', 'AbortError');
    });
    const writeTextSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      share: shareSpy,
      clipboard: { writeText: writeTextSpy },
    });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(result).toBe('cancelled');
    expect(writeTextSpy).not.toHaveBeenCalled();
  });

  it('should fall back to the clipboard when the Web Share API is unavailable', async () => {
    const writeTextSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText: writeTextSpy },
    });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/1');
    expect(result).toBe('copied');
  });

  it('should fall back to the clipboard when sharing fails for a reason other than cancellation', async () => {
    const shareSpy = vi.fn(async () => {
      throw new Error('permission denied');
    });
    const writeTextSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      share: shareSpy,
      clipboard: { writeText: writeTextSpy },
    });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/1');
    expect(result).toBe('copied');
  });

  it('should report unsupported, rather than rejecting, when the clipboard write itself fails', async () => {
    const writeTextSpy = vi.fn(async () => {
      throw new DOMException('Document is not focused.', 'NotAllowedError');
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText: writeTextSpy },
    });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(result).toBe('unsupported');
  });

  it('should report unsupported when neither API is available', async () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: undefined });
    const service = setup();

    const result = await service.share({ title: 'A nice chair', url: 'https://example.com/1' });

    expect(result).toBe('unsupported');
  });
});
