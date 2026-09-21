import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../application/services/auth.service';
import { ErrorService } from '../../application/services/error.service';
import { UserService } from '../../application/services/user.service';
import {
  ONBOARDING_STEPPER_STEPS,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingDestination,
  type OnboardingProfilePatch,
  type OnboardingStepId,
} from './onboarding.config';

/**
 * What a step component hands over when it activates. Everything is optional
 * because most steps only need to say which step they are: the photo and
 * location screens are skippable (always continuable) and the location screen
 * has nothing to persist onto the profile at all.
 */
export interface OnboardingStepRegistration {
  readonly id: OnboardingStepId;
  /**
   * Read at Continue time rather than pushed on every change, so the service
   * always sees the step's current state without the step having to keep it
   * in sync. Defaults to always continuable.
   */
  readonly canContinue?: () => boolean;
  /** The profile fields this step collects. Defaults to nothing to save. */
  readonly changes?: () => OnboardingProfilePatch;
}

/**
 * Drives the whole flow from ONBOARDING_STEPS: the shared footer's label,
 * whether a Back button exists, where each button navigates, the stepper's
 * position and labels, and the save-on-continue itself.
 *
 * Step components therefore only declare *which* step they are and what they
 * collect (see startStep) — they never name a destination or a button label,
 * so the flow's shape lives in one file instead of being spread across five
 * components that can disagree.
 *
 * Root-scoped rather than provided by the shell: the welcome and done screens
 * are siblings of the shell, not children of it, so there's no single
 * component instance that outlives every step.
 */
@Service()
export class OnboardingService {
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);

  private readonly stepId = signal<OnboardingStepId>('welcome');
  private readonly canContinueSource = signal<() => boolean>(() => true);
  private readonly changesSource = signal<() => OnboardingProfilePatch>(() => ({}));

  /** True only while a save is in flight — the footer disables both buttons on it. */
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly step = computed(() => ONBOARDING_STEPS[this.stepId()]);
  readonly canContinue = computed(() => this.canContinueSource()());
  readonly showBack = computed(() => this.step().backRoute !== undefined);

  readonly totalSteps = ONBOARDING_TOTAL_STEPS;
  /** 0 for screens outside the stepper (welcome, done), which don't render one. */
  readonly stepperPosition = computed(() => this.step().stepperPosition ?? 0);

  /**
   * translate() reads the active language once rather than subscribing, so the
   * label computeds below take a dependency on this to stay correct if the
   * language changes while the flow is open.
   */
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly continueLabel = computed(() => {
    this.activeLang();
    return this.transloco.translate(this.step().continueLabelKey);
  });

  readonly stepperLabels = computed(() => {
    this.activeLang();
    return ONBOARDING_STEPPER_STEPS.map((step) => this.transloco.translate(step.stepperLabelKey));
  });

  /**
   * Called once by each step component as it activates. Also clears the
   * previous step's loading/error state, which this service outlives.
   */
  startStep(registration: OnboardingStepRegistration): void {
    this.stepId.set(registration.id);
    this.canContinueSource.set(registration.canContinue ?? (() => true));
    this.changesSource.set(registration.changes ?? (() => ({})));
    this.loading.set(false);
    this.errorMessage.set(null);
  }

  /**
   * Saves whatever the active step collected, then advances. Each step saves
   * as the user leaves it rather than the flow batching one write at the end,
   * so abandoning midway still keeps the work done so far.
   *
   * `onboarded` is never written here — see OnboardingProfilePatch.
   */
  async continue(): Promise<void> {
    if (this.loading() || !this.canContinue()) return;

    const { continueRoute } = this.step();
    this.errorMessage.set(null);

    // A step the user passed through without editing anything (skipping the
    // photo, or coming Back and continuing again) writes nothing at all.
    const changes = this.changedFields();
    if (!changes) {
      await this.navigateTo(continueRoute);
      return;
    }

    this.loading.set(true);
    try {
      await this.persist(changes);
      await this.navigateTo(continueRoute);
    } catch (err) {
      // Left on the current step with the message rendered by the footer, so
      // the user can retry rather than losing what they entered.
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async goBack(): Promise<void> {
    const { backRoute } = this.step();
    if (!backRoute || this.loading()) return;
    await this.navigateTo(backRoute);
  }

  /**
   * The subset of what the step collected that actually differs from the
   * stored profile, or null if nothing does. `undefined` means "this step
   * didn't collect this field", which is distinct from clearing it.
   */
  private changedFields(): OnboardingProfilePatch | null {
    const profile = this.userService.profile();
    if (!profile) return null;

    const requested = this.changesSource()();
    const changed: OnboardingProfilePatch = {};

    if (requested.displayName !== undefined && requested.displayName !== profile.displayName) {
      changed.displayName = requested.displayName;
    }
    if (requested.photoUrl !== undefined && requested.photoUrl !== profile.photoUrl) {
      changed.photoUrl = requested.photoUrl;
    }

    return Object.keys(changed).length > 0 ? changed : null;
  }

  private async persist(changes: OnboardingProfilePatch): Promise<void> {
    const profile = this.userService.profile();
    if (!profile) return;

    // A whole User, not just the patch — FirestoreUserRepository.update()
    // writes a fixed field set and would blank the rest.
    await this.userService.updateProfile({ ...profile, ...changes });

    // Firebase Auth keeps its own copy of these two and nothing syncs it from
    // Firestore; the navbar and avatar read AuthService.currentUser(), so they
    // would show stale values until the next sign-in without this.
    if (changes.displayName !== undefined) {
      await this.authService.updateDisplayName(changes.displayName);
    }
    if (changes.photoUrl !== undefined) {
      await this.authService.updatePhotoUrl(changes.photoUrl);
    }
  }

  private async navigateTo(destination: OnboardingDestination): Promise<void> {
    await this.router.navigateByUrl(destination);
  }
}
