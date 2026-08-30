import { TestBed } from '@angular/core/testing';
import { ImageLightboxService } from './image-lightbox.service';

const { lightboxCtorMock, lightboxInitMock, lightboxLoadAndOpenMock, lightboxDestroyMock } =
  vi.hoisted(() => ({
    lightboxCtorMock: vi.fn(),
    lightboxInitMock: vi.fn(),
    lightboxLoadAndOpenMock: vi.fn(),
    lightboxDestroyMock: vi.fn(),
  }));

vi.mock('photoswipe/lightbox', () => ({
  default: class {
    constructor(options: unknown) {
      lightboxCtorMock(options);
    }
    init = lightboxInitMock;
    loadAndOpen = lightboxLoadAndOpenMock;
    destroy = lightboxDestroyMock;
  },
}));

// jsdom has no real image pipeline, so `new Image()`'s onload/onerror never
// fire on their own. This fake resolves based on the URL so both the
// success and failure paths can be exercised.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;

  set src(value: string) {
    queueMicrotask(() => {
      if (value.includes('broken')) this.onerror?.();
      else this.onload?.();
    });
  }
}

describe('ImageLightboxService', () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    vi.clearAllMocks();
    originalImage = window.Image;
    window.Image = FakeImage as unknown as typeof Image;
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    window.Image = originalImage;
  });

  it('should create', () => {
    const service = TestBed.inject(ImageLightboxService);
    expect(service).toBeTruthy();
  });

  it('should build a dataSource with natural dimensions and alt text, then open at the given index', async () => {
    const service = TestBed.inject(ImageLightboxService);

    await service.open(['a.jpg', 'b.jpg'], 1, (i) => `Photo ${i + 1}`);

    expect(lightboxLoadAndOpenMock).toHaveBeenCalledWith(1, [
      { src: 'a.jpg', width: 800, height: 600, alt: 'Photo 1' },
      { src: 'b.jpg', width: 800, height: 600, alt: 'Photo 2' },
    ]);
  });

  it('should default to an empty alt when no altText callback is given', async () => {
    const service = TestBed.inject(ImageLightboxService);

    await service.open(['a.jpg'], 0);

    expect(lightboxLoadAndOpenMock).toHaveBeenCalledWith(0, [
      { src: 'a.jpg', width: 800, height: 600, alt: '' },
    ]);
  });

  it('should fall back to 0x0 dimensions for a photo that fails to load, without blocking the rest', async () => {
    const service = TestBed.inject(ImageLightboxService);

    await service.open(['broken.jpg', 'a.jpg'], 0);

    expect(lightboxLoadAndOpenMock).toHaveBeenCalledWith(0, [
      { src: 'broken.jpg', width: 0, height: 0, alt: '' },
      { src: 'a.jpg', width: 800, height: 600, alt: '' },
    ]);
  });

  it('should create the underlying lightbox instance only once across repeated opens', async () => {
    const service = TestBed.inject(ImageLightboxService);

    await service.open(['a.jpg'], 0);
    await service.open(['b.jpg'], 0);

    expect(lightboxCtorMock).toHaveBeenCalledTimes(1);
    expect(lightboxInitMock).toHaveBeenCalledTimes(1);
    expect(lightboxLoadAndOpenMock).toHaveBeenCalledTimes(2);
  });
});
