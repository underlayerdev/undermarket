import type { User } from '../../domain/user/user.model';

/**
 * Single source of truth for the onboarding flow: which screens exist, where
 * each one is mounted, what its Continue button says, and where Continue/Back
 * lead.
 *
 * Everything else in the feature derives from here rather than restating it —
 * onboarding.routes.ts mounts `path`, OnboardingService drives the shared
 * footer off `continueRoute`/`backRoute`/`continueLabelKey`, the shell's
 * stepper is built from `stepperPosition`/`stepperLabelKey`, and the guards
 * redirect to routes taken from ONBOARDING_ROUTES. Adding a screen means
 * adding its id to ONBOARDING_STEP_IDS below, which turns every map in this
 * file into a compile error until the new screen is fully described.
 */

// ─────────────────────────── Step identity ───────────────────────────

/**
 * Every screen in the flow, in the order the user walks through them. This is
 * the list that makes the rest of the file exhaustive.
 */
export const ONBOARDING_STEP_IDS = ['welcome', 'name', 'photo', 'location', 'done'] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

/** Narrows an arbitrary string (a router URL segment, a stored value) to a known step. */
export function isOnboardingStepId(value: string): value is OnboardingStepId {
  return (ONBOARDING_STEP_IDS as readonly string[]).includes(value);
}

// ──────────────────────── Paths and route URLs ───────────────────────

/** The feature's mount point in app.routes.ts. */
export const ONBOARDING_BASE_PATH = 'onboarding';

type BasePath = typeof ONBOARDING_BASE_PATH;

/**
 * Route segment each step is mounted at, relative to the base path — this is
 * what goes in a `Route.path`. Welcome is the index route, hence ''.
 */
export const ONBOARDING_PATHS = {
  welcome: '',
  name: 'name',
  photo: 'photo',
  location: 'location',
  done: 'done',
} as const satisfies Record<OnboardingStepId, string>;

type OnboardingPathMap = typeof ONBOARDING_PATHS;

/** Any one of the flow's route segments — '' | 'name' | 'photo' | ... */
export type OnboardingPath = OnboardingPathMap[OnboardingStepId];

type ToRoute<P extends string> = P extends '' ? BasePath : `${BasePath}/${P}`;

type OnboardingRouteMap = {
  readonly [Id in OnboardingStepId]: ToRoute<OnboardingPathMap[Id]>;
};

/**
 * Router-ready URL for every step, e.g. ONBOARDING_ROUTES.name is typed as the
 * literal 'onboarding/name' — not merely `string`, so a destination that isn't
 * a real screen can't be passed to navigate or stored in a step's
 * continueRoute/backRoute.
 *
 * No leading slash: Router.navigateByUrl() resolves these from the root either
 * way, and createUrlTree() wants the bare segment.
 */
export const ONBOARDING_ROUTES: OnboardingRouteMap = Object.fromEntries(
  ONBOARDING_STEP_IDS.map((id) => {
    const path: string = ONBOARDING_PATHS[id];
    return [id, path ? `${ONBOARDING_BASE_PATH}/${path}` : ONBOARDING_BASE_PATH];
  }),
) as OnboardingRouteMap;

export type OnboardingRoute = OnboardingRouteMap[OnboardingStepId];

/**
 * The only route outside the flow it may hand off to — the done screen's
 * Continue. Keeping it in the destination union means a step can't be pointed
 * at some arbitrary page by accident.
 */
export const ONBOARDING_EXIT_ROUTE = 'home';

export type OnboardingExitRoute = typeof ONBOARDING_EXIT_ROUTE;

/** Everywhere an onboarding button is allowed to send the user. */
export type OnboardingDestination = OnboardingRoute | OnboardingExitRoute;

// ────────────────────────── Translation keys ─────────────────────────

/**
 * Continue-button label keys, as a closed union rather than `string`, so a key
 * that doesn't exist in assets/i18n/*.json can't be wired up here — a typo
 * would otherwise only show up as the raw key rendered in the UI.
 */
export type OnboardingContinueLabelKey =
  | 'onboarding.welcome.getStarted'
  | 'onboarding.continue'
  | 'onboarding.finish'
  | 'onboarding.done.cta';

/** Same, for the labels under the shell's stepper. */
export type OnboardingStepperLabelKey =
  'onboarding.stepLabels.name' | 'onboarding.stepLabels.photo' | 'onboarding.stepLabels.location';

// ──────────────────────────── Stepper slots ──────────────────────────

/**
 * 1-based position in the shell's stepper. Only the three data-entry screens
 * get one — welcome and done are full-page screens outside the shell, and
 * showing them as "1 of 5" would misreport how much work is left. Widen this
 * union when a fourth data-entry screen is added; ONBOARDING_TOTAL_STEPS
 * follows automatically.
 */
export type OnboardingStepperPosition = 1 | 2 | 3;

// ─────────────────────── Writable profile fields ─────────────────────

/**
 * The only User fields onboarding is allowed to write. Notably absent:
 * `onboarded`, which is server-only — a Firestore trigger
 * (functions/src/users/on-update.ts) flips it once it sees a valid
 * displayName, and firestore.rules rejects any client write that changes it.
 * Encoding that here makes it a compile error rather than a convention.
 */
export type OnboardingProfileField = 'displayName' | 'photoUrl';

/** What a step hands to OnboardingService to persist when Continue is pressed. */
export type OnboardingProfilePatch = Partial<Pick<User, OnboardingProfileField>>;

// ───────────────────────────── Step config ───────────────────────────

export interface OnboardingStepConfig<Id extends OnboardingStepId = OnboardingStepId> {
  readonly id: Id;
  /** Segment to mount at in onboarding.routes.ts. */
  readonly path: OnboardingPathMap[Id];
  /** Absolute URL, for navigating *to* this step. */
  readonly route: OnboardingRouteMap[Id];
  /** Where Continue goes. */
  readonly continueRoute: OnboardingDestination;
  /** Where Back goes. Absent means this screen shows no Back button at all. */
  readonly backRoute?: OnboardingDestination;
  readonly continueLabelKey: OnboardingContinueLabelKey;
  /** Absent means this screen isn't represented in the shell's stepper. */
  readonly stepperPosition?: OnboardingStepperPosition;
  readonly stepperLabelKey?: OnboardingStepperLabelKey;
}

/**
 * Keyed by id so a lookup is a total function, and typed per-key so
 * ONBOARDING_STEPS.name.route narrows to 'onboarding/name'.
 *
 * `backRoute` is deliberately omitted on welcome, name and done: those three
 * screens have no Back button. Welcome and name are the entry point (there's
 * nothing behind them), and done is past the point of no return — the profile
 * is already saved and `onboarded` has already flipped server-side, so
 * stepping back into the flow would immediately bounce off onboardingGuard.
 */
export const ONBOARDING_STEPS: {
  readonly [Id in OnboardingStepId]: OnboardingStepConfig<Id>;
} = {
  welcome: {
    id: 'welcome',
    path: ONBOARDING_PATHS.welcome,
    route: ONBOARDING_ROUTES.welcome,
    continueRoute: ONBOARDING_ROUTES.name,
    continueLabelKey: 'onboarding.welcome.getStarted',
  },
  name: {
    id: 'name',
    path: ONBOARDING_PATHS.name,
    route: ONBOARDING_ROUTES.name,
    continueRoute: ONBOARDING_ROUTES.photo,
    continueLabelKey: 'onboarding.continue',
    stepperPosition: 1,
    stepperLabelKey: 'onboarding.stepLabels.name',
  },
  photo: {
    id: 'photo',
    path: ONBOARDING_PATHS.photo,
    route: ONBOARDING_ROUTES.photo,
    continueRoute: ONBOARDING_ROUTES.location,
    backRoute: ONBOARDING_ROUTES.name,
    continueLabelKey: 'onboarding.continue',
    stepperPosition: 2,
    stepperLabelKey: 'onboarding.stepLabels.photo',
  },
  location: {
    id: 'location',
    path: ONBOARDING_PATHS.location,
    route: ONBOARDING_ROUTES.location,
    continueRoute: ONBOARDING_ROUTES.done,
    backRoute: ONBOARDING_ROUTES.photo,
    continueLabelKey: 'onboarding.finish',
    stepperPosition: 3,
    stepperLabelKey: 'onboarding.stepLabels.location',
  },
  done: {
    id: 'done',
    path: ONBOARDING_PATHS.done,
    route: ONBOARDING_ROUTES.done,
    continueRoute: ONBOARDING_EXIT_ROUTE,
    continueLabelKey: 'onboarding.done.cta',
  },
};

// ────────────────────────── Derived collections ──────────────────────

/** Every step in flow order. */
export const ONBOARDING_STEP_LIST: readonly OnboardingStepConfig[] = ONBOARDING_STEP_IDS.map(
  (id) => ONBOARDING_STEPS[id],
);

/** A step that occupies a slot in the shell's stepper. */
export type OnboardingStepperStepConfig = OnboardingStepConfig & {
  readonly stepperPosition: OnboardingStepperPosition;
  readonly stepperLabelKey: OnboardingStepperLabelKey;
};

function isStepperStep(step: OnboardingStepConfig): step is OnboardingStepperStepConfig {
  return step.stepperPosition !== undefined && step.stepperLabelKey !== undefined;
}

/** The stepper's slots, in position order — drives both its labels and its length. */
export const ONBOARDING_STEPPER_STEPS: readonly OnboardingStepperStepConfig[] = [
  ...ONBOARDING_STEP_LIST.filter(isStepperStep),
].sort((a, b) => a.stepperPosition - b.stepperPosition);

/** Derived from the config rather than hardcoded, so it can't drift from the labels. */
export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPPER_STEPS.length;
