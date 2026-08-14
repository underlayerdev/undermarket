---
name: undermarket-dev
description: Development rules for the Undermarket project (Angular + @underlayerdev/ui). Use it whenever code is created or modified in this repo — components, services, providers, guards, styles, or tests.
when_to_use: When writing, generating, or reviewing any file inside src/app of this project (components, services, styles, tests, routes, providers).
---

# Undermarket — development rules

This skill applies to **all** code written in this project (Angular + Firebase + `@underlayerdev/ui`). Follow it always, not only when explicitly asked.

## 1. Angular — version and style

- Angular 22 (standalone by default, no `NgModule`). Always use standalone components/directives/pipes.
- Native control-flow syntax (`@if`, `@for`, `@switch`) — never `*ngIf`/`*ngFor`.
- File/class names without the `.component.ts` suffix (see the existing convention: `login.ts`, `login.html`, `login.scss`, class `LoginComponent`). Keep that pattern for new components: `<name>.ts` / `.html` / `.scss` (or without `.scss` if not needed — see rule 4).
- `inject()` instead of constructor injection.
- `ChangeDetectionStrategy.OnPush` on every new component.
- Respect the existing layered architecture: `domain/` (models, provider/repository interfaces), `application/services/` (orchestration logic, wrappers over providers), `infrastructure/` (concrete implementations: Firebase, Cloudinary), `features/` (per-feature UI components), `core/` (config, DI tokens, guards, SEO). Don't mix layers — a component in `features/` must not talk to Firebase directly; it must go through `application/services`.

## 2. Signals — priority, but with judgment

- Use `signal()`/`computed()` as the default form for component state and stateful reactive services (this is already the dominant pattern in the repo: see `login.ts`, `auth.service.ts`).
- **Don't** force signals where they add nothing:
  - Purely synchronous, trivial derived values can be a plain function or a computed property if they don't need reactivity in the template.
  - For complex async flows (combined streams, cancellation, debounce) evaluate whether RxJS is clearer; not everything has to be forced into `toSignal()` if the result is less readable.
  - Constants and static configuration never go in a signal.
- If unsure between a signal and a plain variable, ask: "does this need to trigger a re-render or be read reactively in a `computed`/template?" If not, it isn't a signal.

## 3. `@underlayerdev/ui` — ALWAYS, zero hardcoded values

This is the most important rule and has no silent exceptions.

- Before writing a new component, layout, or page, check what components `@underlayerdev/ui` already offers (`ul-button`, `ul-input`, `ul-card`, `ul-select`, `ul-modal`, `ul-toast-container`, `ul-navbar`, `ul-avatar`, `ul-pill`, `ul-status`, `ul-skeleton`, `ul-breadcrumb`, etc.) and use them instead of hand-building UI.
- For typography, color, spacing, radii, and shadows, **always** use the library's compiled utility classes (prefix `ul-`), never loose `px`/`rem`/hex/rgba values:
  - Typography: `ul-typography-{family}-{weight}` (e.g. `ul-typography-body-m-regular`, `ul-typography-headline-l-extrablack`).
  - Color: `ul-text-*`, `ul-bg-*`, `ul-border-*` (e.g. `ul-text-secondary`, `ul-bg-grey-lvl-1`, `ul-border-red`).
  - Spacing: `ul-p-*`, `ul-m-*`, `ul-gap-*` (and `x`/`y`/directional variants) following the library's spacing scale (4, 8, 12, 16, 20, 24, 28, 32...).
  - Radii: `ul-rounded-{1-8,16,full,none}`.
  - Shadows: `ul-shadow-{none,sm,md,lg}`.
  - Grid: `ul-row`, `ul-col-{1-12}`, `ul-container-{fluid,gallery,product,form}`.
- **Before using a `ul-*` class, verify it actually exists** in `node_modules/@underlayerdev/ui/styles/foundations.css` (quick grep). Invented classes that don't exist have already been found (`ul-bg-surface-secondary`, `ul-rounded-md`) and silently did nothing — don't repeat that mistake.
- Since `@underlayerdev/ui@0.1.0`, the package also exposes its raw Sass tokens via a `./design-tokens/*` subpath export (`node_modules/@underlayerdev/ui/design-tokens/_variables.scss` + `_elevations.scss`). Any `.scss` file can pull a token directly:
  ```scss
  @use 'pkg:@underlayerdev/ui/design-tokens' as tokens;

  .something {
    padding: tokens.$spacing-spacing-6;
    color: tokens.$color-text-secondary;
  }
  ```
  This only works per-file — there is no global include, and adding it to `src/styles.scss` does not make the variables available elsewhere (Sass `@use` is scoped to the file that declares it, and Angular's `stylePreprocessorOptions` has no "prepend to every file" option). Prefer the compiled `ul-*` utility classes in HTML first; reach for a raw token only when there's truly no matching utility class, or when a value must be interpolated (e.g. inside a computed style, a media query, or a value passed to a mixin) rather than applied as a static class in markup.
- Breakpoints are also exported as plain Sass variables in the same `design-tokens` subpath — `$breakpoint-xs` (0px), `$breakpoint-sm` (768px), `$breakpoint-md` (1024px), `$breakpoint-lg` (1280px), `$breakpoint-xl` (1600px). **Never hardcode a breakpoint pixel value in a media query** — use the token instead:
  ```scss
  @use 'pkg:@underlayerdev/ui/design-tokens' as tokens;

  @media (min-width: tokens.$breakpoint-sm) { ... }
  @media (max-width: tokens.$breakpoint-md - 1px) { ... } // "below md"
  ```
  This is the same rule as spacing/color/typography tokens above, just for breakpoints — if a value ever needs to change, it should only need to change in one place (the library), not be hunted down across every `.scss` file that duplicated it as a literal.
- **Under no circumstances add a new design value (color, font size, spacing, radius) without asking the user first.** If the design requires a value that has no matching `ul-*` utility class *and* no matching raw Sass token (check `node_modules/@underlayerdev/ui/design-tokens/_variables.scss`):
  1. Ask the user whether that value should be added to the base library (`@underlayerdev/ui`, in the repo `/Users/lucas.yamone@al-pair.de/dev/base`) so it's available going forward, or
  2. If it's specific and not reusable outside this project, define it as a documented local constant (e.g. in a project `_local-tokens.scss`, never scattered as a literal across files).
     Never decide this unilaterally or hardcode it "for now."
- The library is dark-themed (background `ul-bg-main` #0a0a0a, white text, `purple`/`fill-purple` brand). Any new page must follow that theme — don't introduce custom light palettes.
- Pure layout with no design value (`display: flex`, `flex-direction`, `aspect-ratio`, `object-fit`) is exempt from the "no hardcoding" rule above — the rule is about design-scale values (spacing, color, typography, radii, shadows), not structural CSS. But that structural CSS still belongs in the component's `.scss` file as a class, **not** as an inline `style="..."` attribute in the template. Several existing pages (`discover.html`, `settings.html`, `search.html`, `listing-detail.html`, `profile.html`) accumulated `style="display: flex; ..."` sprawl this way — don't add to it, and clean one up if you're already touching that file.
  - Only reach for `style="..."` (or `[style.*]`/`[ngStyle]`) when the value is genuinely dynamic/computed at runtime and there's no sensible reason to add a class for it — e.g. binding a signal-driven width, a color computed from data, or a one-off CSS var. If the value is static, or the same structural pattern (`display: flex; flex-wrap: wrap`, etc.) shows up more than once, it belongs in SCSS as a real class (or an existing `ul-*` layout utility, e.g. `ul-row`/`ul-col-*`), even if that means creating a `.scss` file for a component that didn't have one.

## 4. Don't create empty files

- Don't generate an empty `.scss` (or any other file) "just in case" when a component doesn't need its own styles. If all styling comes from `ul-*` classes or a shared partial, omit `styleUrl` in the `@Component` decorator and don't create the file.
- If a component shares styles with others (like the `@use '../auth-shared'` pattern), evaluate whether the intermediate file is actually needed or whether applying the shared classes directly in the HTML is enough.
- General rule: any file created must have real content from its first commit. If a file becomes unused after a refactor (e.g. a `.scss` whose classes no longer appear in the `.html`), delete or empty it in the same change — don't leave it as debt.

## 5. Formatting with Prettier

- After creating or modifying any file (`.ts`, `.html`, `.scss`), run Prettier on it before considering the work done:
  ```bash
  npx prettier --write <file-path>
  ```
- Config lives in `.prettierrc` (printWidth 100, single quotes, `angular` parser for `.html`) — don't reinterpret or ignore it.
- If several files are created in the same task, format the whole affected directory at the end: `npx prettier --write "src/app/features/<feature>/**/*.{ts,html,scss}"`.

## 6. Unit testing is mandatory

- Every new component and every new service must ship with its `*.spec.ts` in the same change, not as a follow-up task.
- The test runner is the `@angular/build:unit-test` builder (Vitest) — see `tsconfig.spec.json` (`types: ["vitest/globals"]`). Use Vitest's `describe`/`it`/`expect` globals, don't import Jasmine or Jest.
- Component pattern: `TestBed.configureTestingModule({ imports: [MyComponent] })`, create the fixture, verify creation (`toBeTruthy()`) and key behavior (signal bindings, output events, calls to mocked services).
- Service pattern: mock injected dependencies (Firebase providers, `AUTH_PROVIDER`, etc. via DI tokens) instead of hitting real Firebase.
- Cover at least: happy path, one relevant error/edge case, and (if applicable) form validation/computed signal checks.
- Run `ng test` (or the builder's equivalent command) before considering a task done, if the environment allows it.

## 7. Meaningful variable names

- Avoid single-letter or otherwise unclear names in callbacks, even short ones — `(c) => ({ value: c, label: c })` forces the reader to infer what `c` is. Prefer `(category) => ({ value: category, label: category })`.
- This applies to `.map`/`.filter`/`.reduce`/`.find`/etc. callbacks, arrow function params, and destructured variables — not just top-level declarations.
- Short names are fine when the meaning is already unambiguous from tight, obvious scope (e.g. `i` in a bare `for (let i = 0; ...)` loop index), but default to a real word when in doubt.

## 8. Other conventions to respect (found in the repo)

- Strict TypeScript: don't introduce `any` unnecessarily; use the models in `domain/models`.
- Firebase/Auth error messages are centralized in `application/services/error.service.ts` (the `ERROR_MESSAGES` map + `FALLBACK_MESSAGE`) — don't show raw `err.message` in the UI, add the new code to that map instead.
- Auth flows always go through `AuthService` (`application/services/auth.service.ts`), which delegates to the `AUTH_PROVIDER` token — never import `firebase/auth` directly from a `features/` component.
- Before assuming a Firebase pattern (e.g. `fetchSignInMethodsForEmail` to pre-check account existence) behaves as expected, check Firebase project security settings (e.g. Email Enumeration Protection) that can neutralize that behavior.
- Auth routes use `guestGuard`/`authGuard` (`features/auth/guards/`) — don't duplicate redirect logic inside components.
- Before assuming a `ul-*` utility class or a `@underlayerdev/ui` component input/output exists, confirm it against the source in `/Users/lucas.yamone@al-pair.de/dev/base/projects/ui/src` or the compiled CSS/types in `node_modules/@underlayerdev/ui` — don't assume it by analogy with a similarly named one.
