# Checkout Link prototype — source handoff

**For:** whoever is building the link setup page and the Checkout Link PDP
**From:** Blurb design
**Date:** 2026-08-25

The **link setup page** and the **Checkout Link PDP** are owned elsewhere. This package is the
rest of the Checkout Link journey, as source, for you to deploy however suits your demo.

**You don't need to change anything in the checkout, and you don't need the Figma file.**

---

## 1. Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the built dist/ locally
```

Vite + React 18. No backend, no database, no environment variables — it's a front-end
prototype, so any static host works. On Vercel it auto-detects: preset Vite, build
`npm run build`, output `dist`. No `vercel.json` needed.

If Node isn't found, it may be managed by nvm and not on `PATH` in a non-interactive shell:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
```

---

## 2. The journey, and who owns what

1. **Link setup page** — owned elsewhere. Seller-side, not in this prototype at all.
2. **Hosted PDP** — owned elsewhere. A version exists here, to replace or match.
3. **Cart drawer** — here
4. **Guest checkout** — here
5. **Confirmation** — here, including cancelling the order
6. **Transactional email** — here

The PDP that's already built has a book-preview flipbook, an About the author block, a
"More from this author" row, Share, expandable book details, and express payment beneath Add to
cart. Worth a look before rebuilding — matching it costs less than reconciling two different
PDPs later.

---

## 3. Linking to a screen

The app opens on the Checkout Link PDP with no parameters at all.

To open on a specific screen, use `?stage=`:

```
?stage=pdp           Product page (default)
?stage=checkout      Guest checkout
?stage=confirm       Order confirmation
?stage=email         Transactional email
```

Example: `https://your-deployment.vercel.app/?stage=checkout`

**This is what your PDP should hand off to** — it means the crossing from your prototype into
this one is a link, not "and now I click this control", which is the one moment in a demo where
the audience watches the scaffolding instead of the product.

Two things worth knowing:

- A post-order stage opened by URL **backfills** the email, address and shipping method the
  checkout would have collected, so it shows a real order rather than a blank one.
- The parameter seeds the first render only. Navigating afterwards doesn't rewrite the URL, and
  an unrecognised value falls back to the PDP rather than erroring.

There's also a second prototype in the same app — the regular Blurb flow, Add to Cart → Cart →
single-page checkout. You almost certainly don't need it, but it's reachable with
`?flow=addtocart`, `?flow=cart`, `?flow=standard`, `?flow=new`, and from the switcher at the
top left.

---

## 4. Driving it in a demo

The bar at the top of every screen has three zones:

- **Left** — which build, and a switcher between the two prototypes
- **Centre** — a stepper: PDP → Checkout → Confirm → Email. Click any stop.
- **Right** — scenario settings, and a toggle that hides the demo controls for clean screenshots

The scenario settings are what make it worth demoing live:

- **What the link offers** — fixed at `Printed only`, and shown disabled with the reason. A
  checkout link sells the printed book; the PDF is bought from the regular Blurb flow.
- **What was ordered** — drives the confirmation and the email.
- **Express treatment** — one wallet button that expands, or all wallets shown at once.

The gear shows a dot whenever a setting is off its default, so a screenshot of a non-default
scenario is distinguishable from the default one.

Clicking into a form field **auto-fills it** with demo data, so the flow can be walked without
typing. That's deliberate — don't remove it.

---

## 5. Status and caveats

- **Approved as drawn:** the Checkout Link flow in this package.
- **The PDF is not sold on a checkout link.** A link is a seller sharing one book with their
  audience; the PDF is something a maker buys for themselves, so it lives in the regular Blurb
  flow only. The format machinery is still in the code behind a `SELLS_DIGITAL` flag, so the
  decision is reversible, but nothing PDF-shaped renders.
- **Cancelling happens on the confirmation page** — a `Cancel order` control, a confirm dialog,
  and a cancelled state. There is no separate order-status portal.
- **Not in this package:** express payment on the PDP and cart. That's in progress elsewhere;
  ask the Blurb design team if your PDP work needs it.
- **The copy here is behind Figma.** Checkout copy was reworked in Figma on 2026-08-25 and the
  prototype hasn't caught up. Where a string differs, Figma is right. It doesn't affect a demo,
  but don't treat prototype copy as final if you're quoting it.

---

## 6. Notes for the agent reading this

`CLAUDE.md` is included and has the full architecture. The short version:

- The Checkout Link fork is **one self-contained file**: `src/CheckoutLinkApp.jsx`, with its own
  design tokens (`T`) and its own primitives, separate from `src/App.jsx`. That's deliberate.
  Don't "fix" it by importing from the other file.
- All state is `useState`. **No router, no context, no store.** Screens are chosen by a state
  machine, so navigation means setting state, not changing a route. Don't add a router.
- Styling is inline `style={{}}` objects plus a small global `<style>` block in `index.html`. No
  CSS framework, no classes beyond `.ms` for Material Symbols icons.
- Brand blue `#107eb1`, success green `#2e7d32`, light blue panel `#f0f7fb`, borders `#e0e0e0`.
- `src/App.jsx` is deliberately one large file. Don't split it.
- Where Blurb's design system is the authority, follow it — the **Codex Foundation** file has the
  real specs (e.g. Button is 40px tall).
- Before writing code to reach a screen state, check `?stage=`, the stepper and the scenario
  settings. They can almost certainly already get there.
