import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';
import { compressImage } from '../utils/image-compression';

interface ImagePreview {
  file: File;
  url: string;
  compressing: boolean;
}

function isSameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

@Component({
  selector: 'um-image-upload',
  templateUrl: './image-upload.html',
  styleUrl: './image-upload.scss',
  imports: [ButtonComponent, IconComponent, DragDropModule, TranslocoDirective],
})
export class ImageUploadComponent {
  readonly images = model<File[]>([]);
  readonly maxFiles = input(8);
  readonly maxFileSizeMb = input(10);

  private readonly transloco = inject(TranslocoService);

  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly previews = signal<ImagePreview[]>([]);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.previews().forEach((preview) => URL.revokeObjectURL(preview.url));
    });
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected photoAltText(index: number): string {
    return this.transloco.translate('imageUpload.photoAlt', { photoNumber: index + 1 });
  }

  protected async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selected = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!selected.length) return;

    const existing = this.previews().map((preview) => preview.file);
    const unique = selected.filter((file) => !existing.some((added) => isSameFile(added, file)));
    const hadDuplicates = unique.length < selected.length;

    if (!unique.length) {
      this.error.set(this.transloco.translate('imageUpload.alreadyAdded'));
      return;
    }

    const remainingSlots = this.maxFiles() - this.previews().length;
    if (remainingSlots <= 0) {
      this.error.set(
        this.transloco.translate('imageUpload.maxFilesReached', { maxFiles: this.maxFiles() }),
      );
      return;
    }

    const toAdd = unique.slice(0, remainingSlots);
    const hadTooMany = unique.length > toAdd.length;
    this.error.set(
      hadTooMany
        ? this.transloco.translate('imageUpload.maxFilesReached', { maxFiles: this.maxFiles() })
        : hadDuplicates
          ? this.transloco.translate('imageUpload.someSkipped')
          : null,
    );

    const pendingPreviews: ImagePreview[] = toAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      compressing: true,
    }));
    this.previews.update((current) => [...current, ...pendingPreviews]);
    this.syncValue();

    for (const preview of pendingPreviews) {
      const compressed = await compressImage(preview.file);
      if (compressed.size / (1024 * 1024) > this.maxFileSizeMb()) {
        this.error.set(
          this.transloco.translate('imageUpload.fileTooLarge', {
            fileName: preview.file.name,
            maxSizeMb: this.maxFileSizeMb(),
          }),
        );
        this.removePreview(preview);
        continue;
      }

      this.previews.update((current) =>
        current.map((existingPreview) =>
          existingPreview === preview
            ? { ...existingPreview, file: compressed, compressing: false }
            : existingPreview,
        ),
      );
      this.syncValue();
    }
  }

  protected removePreview(preview: ImagePreview): void {
    URL.revokeObjectURL(preview.url);
    this.previews.update((current) =>
      current.filter((existingPreview) => existingPreview !== preview),
    );
    this.syncValue();
  }

  protected moveLeft(index: number): void {
    if (index <= 0) return;
    this.reorder(index, index - 1);
  }

  protected moveRight(index: number): void {
    if (index >= this.previews().length - 1) return;
    this.reorder(index, index + 1);
  }

  protected onDrop(event: CdkDragDrop<ImagePreview[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  private reorder(previousIndex: number, currentIndex: number): void {
    const updated = [...this.previews()];
    moveItemInArray(updated, previousIndex, currentIndex);
    this.previews.set(updated);
    this.syncValue();
  }

  private syncValue(): void {
    this.images.set(this.previews().map((preview) => preview.file));
  }
}
