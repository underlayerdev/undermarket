import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AvatarComponent } from '@underlayerdev/ui';
import { ProfileInfoComponent } from './profile-info';
import { mockUser } from '../../../domain/user/user.mock';
import { User } from '../../../domain/user/user.model';

describe('ProfileInfoComponent', () => {
  function setup(user: User) {
    TestBed.configureTestingModule({
      imports: [ProfileInfoComponent],
    });

    const fixture = TestBed.createComponent(ProfileInfoComponent);
    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup(mockUser());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the display name and email', () => {
    const fixture = setup(mockUser());

    expect(fixture.nativeElement.textContent).toContain('Test User');
    expect(fixture.nativeElement.textContent).toContain('test@example.com');
  });

  it('should pass the initials and photo url to the avatar', () => {
    const fixture = setup(mockUser({ photoUrl: 'https://example.com/photo.png' }));

    const avatar = fixture.debugElement.query(By.directive(AvatarComponent));
    expect(avatar.componentInstance.initials()).toBe('T');
    expect(avatar.componentInstance.src()).toBe('https://example.com/photo.png');
  });

  it('should leave the avatar src undefined when the user has no photo', () => {
    const fixture = setup(mockUser({ photoUrl: undefined }));

    const avatar = fixture.debugElement.query(By.directive(AvatarComponent));
    expect(avatar.componentInstance.src()).toBeUndefined();
  });
});
