import { TestBed } from '@angular/core/testing';
import imageCompression from 'browser-image-compression';
import { ImageUploadComponent } from './image-upload';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
}));

function createFile(name: string, sizeBytes = 1024, lastModified = 1700000000000): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/png', lastModified });
}

describe('ImageUploadComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(imageCompression).mockImplementation(async (file) => file as File);
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    // jsdom has no matchMedia; the carousel's underlying Splide instance calls
    // it on mount to watch for reduced-motion/breakpoint changes.
    window.matchMedia ??= vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    TestBed.configureTestingModule({
      imports: [ImageUploadComponent, getTranslocoTestingModule()],
    });
  });

  function selectViaComponent(component: ImageUploadComponent, files: File[]): Promise<void> {
    const event = { target: { files, value: '' } } as unknown as Event;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (component as any).onFilesSelected(event);
  }

  it('should create', () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the photo carousel once at least one file is selected', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    await selectViaComponent(component, [createFile('a.png')]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul-carousel')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('ul-carousel-item').length).toBe(2); // photo + add tile
  });

  it('should append newly selected files to the existing value instead of replacing it', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png')]);
    await selectViaComponent(component, [createFile('b.png')]);

    expect(component.images().map((f) => f.name)).toEqual(['a.png', 'b.png']);
  });

  it('should reject additional files beyond maxFiles and set an error', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    fixture.componentRef.setInput('maxFiles', 1);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png'), createFile('b.png')]);

    expect(component.images().map((f) => f.name)).toEqual(['a.png']);
    expect(component['error']()).toContain('up to 1 photos');
  });

  it('should remove a file whose compressed size exceeds maxFileSizeMb', async () => {
    vi.mocked(imageCompression).mockResolvedValueOnce(createFile('big.png', 20 * 1024 * 1024));

    const fixture = TestBed.createComponent(ImageUploadComponent);
    fixture.componentRef.setInput('maxFileSizeMb', 10);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('big.png', 20 * 1024 * 1024)]);

    expect(component.images()).toEqual([]);
    expect(component['error']()).toContain('too large');
  });

  it('should reorder files when moving a file left or right', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [
      createFile('a.png'),
      createFile('b.png'),
      createFile('c.png'),
    ]);

    component['moveRight'](0);
    expect(component.images().map((f) => f.name)).toEqual(['b.png', 'a.png', 'c.png']);

    component['moveLeft'](2);
    expect(component.images().map((f) => f.name)).toEqual(['b.png', 'c.png', 'a.png']);
  });

  it('should not move a file left when it is already first, or right when it is already last', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png'), createFile('b.png')]);

    component['moveLeft'](0);
    component['moveRight'](1);

    expect(component.images().map((f) => f.name)).toEqual(['a.png', 'b.png']);
  });

  it('should remove a preview and revoke its object URL', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png')]);
    const preview = component['previews']()[0];

    component['removePreview'](preview);

    expect(component.images()).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should invoke compression for each selected file', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png'), createFile('b.png')]);

    expect(imageCompression).toHaveBeenCalledTimes(2);
  });

  it('should filter out a file that was already added', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png')]);
    await selectViaComponent(component, [createFile('a.png'), createFile('b.png')]);

    expect(component.images().map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(component['error']()).toBe('Some photos were already added and were skipped.');
  });

  it('should set an error and add nothing when every selected file is a duplicate', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png')]);
    await selectViaComponent(component, [createFile('a.png')]);

    expect(component.images().map((f) => f.name)).toEqual(['a.png']);
    expect(component['error']()).toBe('That photo has already been added.');
  });

  it('should treat files with the same name but different content as distinct', async () => {
    const fixture = TestBed.createComponent(ImageUploadComponent);
    const component = fixture.componentInstance;

    await selectViaComponent(component, [createFile('a.png', 1024)]);
    await selectViaComponent(component, [createFile('a.png', 2048)]);

    expect(component.images().map((f) => f.size)).toEqual([1024, 2048]);
  });
});
