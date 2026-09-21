import {
  ONBOARDING_BASE_PATH,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LIST,
  type OnboardingStepConfig,
  type OnboardingStepId,
} from './onboarding.config';

/**
 * Lookups over ONBOARDING_STEPS. Prefer getOnboardingStep() — indexing by id
 * is total, so it never hands back `undefined` for callers to handle.
 */

export function getOnboardingStep<Id extends OnboardingStepId>(id: Id): OnboardingStepConfig<Id> {
  return ONBOARDING_STEPS[id];
}

/**
 * Resolves a router URL back to its step. Returns undefined for a URL outside
 * the flow, which is honest: the input is a runtime string, not a typed id.
 *
 * Tolerates the shapes the router actually produces — a leading slash, a query
 * string or fragment, a trailing slash — so callers can pass Router.url
 * straight in.
 */
export function findOnboardingStepByUrl(url: string): OnboardingStepConfig | undefined {
  const path = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  if (path !== ONBOARDING_BASE_PATH && !path.startsWith(`${ONBOARDING_BASE_PATH}/`)) {
    return undefined;
  }
  return ONBOARDING_STEP_LIST.find((step) => step.route === path);
}
