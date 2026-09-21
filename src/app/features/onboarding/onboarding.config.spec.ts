import {
  ONBOARDING_EXIT_ROUTE,
  ONBOARDING_PATHS,
  ONBOARDING_ROUTES,
  ONBOARDING_STEPPER_STEPS,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_IDS,
  ONBOARDING_STEP_LIST,
  ONBOARDING_TOTAL_STEPS,
  isOnboardingStepId,
} from './onboarding.config';
import { findOnboardingStepByUrl, getOnboardingStep } from './onboarding.helper';

// These assert the *shape* of the flow, which is the whole point of the config
// existing: the components read it rather than restating it, so a change here
// is the one place a behaviour change has to be made deliberately.
describe('onboarding config', () => {
  it('should mount the five screens of the flow', () => {
    expect(ONBOARDING_STEP_IDS).toEqual(['welcome', 'name', 'photo', 'location', 'done']);
  });

  it('should build each step URL from the base path', () => {
    expect(ONBOARDING_ROUTES).toEqual({
      // The index route of /onboarding, hence no segment of its own.
      welcome: 'onboarding',
      name: 'onboarding/name',
      photo: 'onboarding/photo',
      location: 'onboarding/location',
      done: 'onboarding/done',
    });
  });

  it('should keep the mounted path and the navigable URL consistent for every step', () => {
    for (const step of ONBOARDING_STEP_LIST) {
      const expected = step.path ? `onboarding/${step.path}` : 'onboarding';
      expect(step.route).toBe(expected);
      expect(step.path).toBe(ONBOARDING_PATHS[step.id]);
    }
  });

  it('should chain every step forward to the next one, and out of the flow at the end', () => {
    expect(ONBOARDING_STEPS.welcome.continueRoute).toBe(ONBOARDING_ROUTES.name);
    expect(ONBOARDING_STEPS.name.continueRoute).toBe(ONBOARDING_ROUTES.photo);
    expect(ONBOARDING_STEPS.photo.continueRoute).toBe(ONBOARDING_ROUTES.location);
    expect(ONBOARDING_STEPS.location.continueRoute).toBe(ONBOARDING_ROUTES.done);
    expect(ONBOARDING_STEPS.done.continueRoute).toBe(ONBOARDING_EXIT_ROUTE);
  });

  it('should give a Back route only to the steps that have somewhere to go back to', () => {
    // Welcome and name are the entry point; done is past the point of no
    // return, with the profile already saved and `onboarded` already flipped.
    expect(ONBOARDING_STEPS.welcome.backRoute).toBeUndefined();
    expect(ONBOARDING_STEPS.name.backRoute).toBeUndefined();
    expect(ONBOARDING_STEPS.done.backRoute).toBeUndefined();

    expect(ONBOARDING_STEPS.photo.backRoute).toBe(ONBOARDING_ROUTES.name);
    expect(ONBOARDING_STEPS.location.backRoute).toBe(ONBOARDING_ROUTES.photo);
  });

  it('should only ever send Back to a step that leads forward again to it', () => {
    for (const step of ONBOARDING_STEP_LIST) {
      if (!step.backRoute) continue;
      const previous = ONBOARDING_STEP_LIST.find((other) => other.route === step.backRoute);
      expect(previous?.continueRoute).toBe(step.route);
    }
  });

  it('should number the stepper contiguously from 1 and derive its length', () => {
    expect(ONBOARDING_STEPPER_STEPS.map((step) => step.id)).toEqual(['name', 'photo', 'location']);
    expect(ONBOARDING_STEPPER_STEPS.map((step) => step.stepperPosition)).toEqual([1, 2, 3]);
    expect(ONBOARDING_TOTAL_STEPS).toBe(3);
  });

  describe('isOnboardingStepId', () => {
    it('should accept a known step', () => {
      expect(isOnboardingStepId('photo')).toBe(true);
    });

    it('should reject anything else', () => {
      expect(isOnboardingStepId('profile')).toBe(false);
    });
  });

  describe('lookups', () => {
    it('should resolve a step by id', () => {
      expect(getOnboardingStep('photo').route).toBe('onboarding/photo');
    });

    it.each([
      'onboarding/name',
      '/onboarding/name',
      '/onboarding/name/',
      '/onboarding/name?ref=email',
      '/onboarding/name#top',
    ])('should resolve %s back to the name step', (url) => {
      expect(findOnboardingStepByUrl(url)?.id).toBe('name');
    });

    it('should resolve the base path to the welcome step', () => {
      expect(findOnboardingStepByUrl('/onboarding')?.id).toBe('welcome');
    });

    it.each(['/home', '/onboarding-extras', '/settings/onboarding/name'])(
      'should not resolve %s to any step',
      (url) => {
        expect(findOnboardingStepByUrl(url)).toBeUndefined();
      },
    );
  });
});
