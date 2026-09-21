import { TestBed } from '@angular/core/testing';
import { SettingsFeedbackService } from './settings-feedback.service';

describe('SettingsFeedbackService', () => {
  function setup() {
    TestBed.configureTestingModule({});
    return TestBed.inject(SettingsFeedbackService);
  }

  it('should start closed', () => {
    const service = setup();

    expect(service.open()).toBe(false);
  });

  it('should open with the success variant and message', () => {
    const service = setup();

    service.success('Display name updated.');

    expect(service.open()).toBe(true);
    expect(service.variant()).toBe('success');
    expect(service.message()).toBe('Display name updated.');
  });

  it('should open with the error variant and message', () => {
    const service = setup();

    service.error('Something went wrong.');

    expect(service.open()).toBe(true);
    expect(service.variant()).toBe('error');
    expect(service.message()).toBe('Something went wrong.');
  });

  it('should let a later call replace an still-open one', () => {
    const service = setup();
    service.success('Display name updated.');

    service.error('Something went wrong.');

    expect(service.open()).toBe(true);
    expect(service.variant()).toBe('error');
    expect(service.message()).toBe('Something went wrong.');
  });

  it('should close on dismiss without touching the last variant/message', () => {
    const service = setup();
    service.success('Display name updated.');

    service.dismiss();

    expect(service.open()).toBe(false);
    expect(service.variant()).toBe('success');
    expect(service.message()).toBe('Display name updated.');
  });
});
