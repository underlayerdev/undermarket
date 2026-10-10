import { TestBed } from '@angular/core/testing';
import { ErrorService } from './error.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('ErrorService', () => {
  function setup(): ErrorService {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    return TestBed.inject(ErrorService);
  }

  it('should explain a refused display name', () => {
    expect(setup().toUserMessage({ code: 'user/display-name-invalid' })).toBe(
      "That display name isn't allowed.",
    );
  });

  it('should map a coded error with a message too', () => {
    const error = Object.assign(new Error('Display name rejected.'), {
      code: 'user/display-name-invalid',
    });

    expect(setup().toUserMessage(error)).toBe("That display name isn't allowed.");
  });

  it('should fall back to a generic message for an unknown error', () => {
    expect(setup().toUserMessage({ code: 'something/unknown' })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
