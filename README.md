# Paystub Check Audit Report

A static reporting dashboard built with **React + Vite + TypeScript** and the
**Trimble Modus Web Components** design system. Admins use it to cross-reference
the number of generated payroll checks against what actually loaded into
Employee Self-Service (ESS), so missing paystubs can be surfaced quickly for
support tickets.

> This is an MVP with mock data. Every "query" is deterministic and runs
> entirely in the browser.

## Features

- **Multi-role shell** with a header role switcher to toggle between two views:
  - **Global Admin** — `Main Menu → Global Admin → Paystub Audit Report`
  - **HR Admin** — `Main Menu → Reports (Admin) → Paystub Audit Report`
  - The active role is derived from (and reflected in) the URL, and drives the
    Modus side navigation, breadcrumbs, and which form fields render.
- **Search Parameters panel** using bordered Modus form controls with required
  field validation and inline Modus feedback:
  - `Enterprise ID` (required, Global Admin only)
  - `Company Code` (optional)
  - `Employee Scope` (All Employees / Specific Employee Code)
  - `Employee Code` (required, shown only for "Specific Employee Code")
  - `Check Date` start & end (required)
- **KPI summary cards** (`modus-wc-card`, compact padding, `gap-3` spacing):
  Total Expected Checks and Checks Found in ESS.
- **Results table** (`modus-wc-table`) with sorting + pagination:
  - Interactive `Check Number` link (logs `Download PDF for check <id>`).
  - `Badges` column mapping pay-type keywords to `modus-wc-chip`s
    (`Bonus`, `Final Pay`) with `show-remove="false"`.
- **Empty state** — hides the cards/table and shows *"No results have been
  found."* via `modus-wc-typography`.
  - Tip: enter Company Code `EMPTY` to preview this state.

## Tech / Modus integration

- Modus core components: [`@trimble-oss/moduswebcomponents`](https://www.npmjs.com/package/@trimble-oss/moduswebcomponents) `1.10.0`
- React bindings: `@trimble-oss/moduswebcomponents-react@1.10.0-react18`
- Custom elements are registered once at startup via `defineCustomElements()`.
- Styling: `modus-wc-styles.css` + `modus-icons.css`, theme `modus-modern-light`
  (set on `<html data-theme>`).
- Event handling (`inputChange`, `buttonClick`, `paginationChange`,
  `sortChange`, `mainMenuOpenChange`) is wired through the React bindings, which
  manage listener attach/detach lifecycle to avoid leaks. Handlers are wrapped
  in `useCallback` and table `columns`/`data` in `useMemo` to prevent
  re-render loops.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
npm run lint
```

## GitHub Pages deployment

The app is configured for static hosting on a project sub-path:

- **`base: './'`** in `vite.config.ts` keeps every bundled Modus asset
  resolvable regardless of the repository name / sub-path (e.g.
  `https://<user>.github.io/<repo>/`). To pin to a specific repo instead, set
  `base: '/<repo-name>/'`.
- **Hash History routing** (`HashRouter`) keeps all routes in the URL fragment,
  so deep links and refreshes never 404 on GitHub Pages.

### Automated (recommended)

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the app
and publishes `dist/` to GitHub Pages. Enable it once under
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Manual

```bash
npm run build
# then publish the dist/ folder to your gh-pages branch or Pages source
```

## Project structure

```
src/
  main.tsx                     # entry: Modus init, styles, HashRouter
  App.tsx                      # routes (one per role) + AppShell
  roles.ts                     # role <-> route mapping + useRole()
  styles.css                   # layout + design tokens
  components/
    AppShell.tsx               # navbar (role switcher) + side navigation
    RoleSwitcher.tsx           # header role dropdown
    SideNav.tsx                # role-aware Main Menu -> group -> report
  pages/
    PaystubAuditReport.tsx     # form, KPI cards, table, empty state
  data/
    mockData.ts                # deterministic audit query + types
```
