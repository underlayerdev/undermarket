import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@underlayerdev/ui';
import { ShareButtonComponent } from './share-button';
import { ShareService } from '../share/share.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function setup(shareResult: Awaited<ReturnType<ShareService['share']>>): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<ShareButtonComponent>>;
  shareSpy: ReturnType<typeof vi.fn>;
}> {
  const shareSpy = vi.fn(async () => shareResult);

  TestBed.configureTestingModule({
    imports: [ShareButtonComponent, getTranslocoTestingModule()],
    providers: [{ provide: ShareService, useValue: { share: shareSpy } }],
  });

  const fixture = TestBed.createComponent(ShareButtonComponent);
  fixture.componentRef.setInput('title', 'A nice chair');
  fixture.detectChanges();

  return { fixture, shareSpy };
}

describe('ShareButtonComponent', () => {
  it('should share the current page title and URL', async () => {
    const { fixture, shareSpy } = await setup('shared');

    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushAsync();

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'A nice chair', url: location.href }),
    );
  });

  it('should swap the icon to a checkmark when the share falls back to the clipboard', async () => {
    const { fixture } = await setup('copied');

    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushAsync();
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.directive(IconComponent));
    expect(icon.componentInstance.icon()).toBe('check');
  });

  it('should keep the share icon when the native share sheet was used', async () => {
    const { fixture } = await setup('shared');

    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushAsync();
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.directive(IconComponent));
    expect(icon.componentInstance.icon()).toBe('share');
  });
});
