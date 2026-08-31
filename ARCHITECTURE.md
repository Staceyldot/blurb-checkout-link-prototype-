# Architecture

Reference for anyone — human or agent — changing this prototype. It's a UI/UX prototype of
Blurb's checkout, built as a Vite + React app.

## The two prototypes in this app

`App()` picks one of four experiences from `experience` state, switchable from the bar at the
top of every screen and openable directly by URL:

- **`checkout-link`** — the Checkout Link journey: hosted PDP → cart drawer → guest checkout →
  confirmation → transactional email. **This is the one that matters here.** It lives entirely in `src/CheckoutLinkApp.jsx` and is the default with no
  URL parameters.
- **`addtocart` / `cart` / `standard`** — the regular Blurb flow: Add to Cart → Cart →
  single-page checkout → confirmation. `src/App.jsx`. Reachable with `?flow=addtocart`,
  `?flow=cart`, `?flow=standard`, `?flow=new`.

## Files

- `index.html` — Vite entry. Holds the global `<style>` block and the Material Symbols font
  link; mounts `src/main.jsx`.
- `src/main.jsx` — renders `<App />` into `#root`.
- `src/App.jsx` — the regular flow, plus the root `App` that chooses which prototype to show.
- `src/CheckoutLinkApp.jsx` — the Checkout Link fork, self-contained.
- `public/assets/` — images and wallet marks.

`App.jsx` is deliberately one large file. Keep it that way.

## The Checkout Link state machine

One `view` state: `pdp` → `checkout` → `confirm` → `email`.

`?stage=<key>` seeds it on first render. A post-order stage reached that way calls
`backfillOrder()`, which supplies the email, address and shipping method the checkout would
have collected — without it a jumped-to confirmation renders an order of nothing.

`CheckoutLinkApp` holds all cross-screen state: `variant` (what the seller put on the link),
`format` (what the buyer chose), quantity, email, applied promo code, shipping address, method
and cost, billing address, and whether payment completed.

Switching the link variant **restarts the demo** — a different link is a different product on
sale, so carrying cart state across would misrepresent it.

`SELLS_DIGITAL = false` at the top of the file is what keeps the PDF off a checkout link. Every
PDF-shaped branch is gated on either `variant === "both"` or `hasDigital(format)`, so pinning the
variant to print turns off the format chooser, the cart's upsell, the PDF line item and the
digital branches at once. Flip the constant to bring the whole path back.

`CANCEL_WINDOW_OPEN` is the other scenario constant: `true` gives the confirmation its
`Cancel order` control, `false` gives the expired-window copy.

## Two copies of everything, on purpose

`App.jsx` and `CheckoutLinkApp.jsx` each carry their **own** design tokens (`T`) and their own
primitives — `Input`, `Btn`, `AccordionSection`, the wallet buttons, the demo bar. This is
deliberate: the fork is self-contained. It does mean the two drift, so when you change a token
or a shared primitive, decide whether the other file needs it too rather than assuming.

## Conventions

- Styling is inline `style={{}}` objects plus the small global `<style>` block in `index.html`.
  No CSS framework, no classes beyond `.ms` for Material Symbols icons.
- All design values flow through the `T` tokens object at the top of each source file.
- Brand blue `#107eb1`, success green `#2e7d32`, light blue panel `#f0f7fb`, borders `#e0e0e0`.
- All state is `useState`. **No router, no context, no external store.** Navigation means
  setting state, not changing a route. Don't add a router to make linking easier.
- Width breakpoints come from `useViewport`: `isMobile` <768, `isTablet` 768–1023,
  `isDesktop` ≥1024.
- Clicking into a key form field auto-fills it with demo data so the flow can be walked without
  typing. That's a feature of the prototype, not a bug.
- Where Blurb's design system is the authority, follow it — the **Codex Foundation** file has
  the real specs (e.g. Button is 40px tall).

## Screens, and how to reach them

The bar at the top of every screen has three zones, each pinned to its own edge so nothing
moves when the window resizes:

- **Left** — which prototype
- **Centre** — a stepper for the journey; click any stop
- **Right** — scenario settings, and a toggle that hides the demo controls for clean screenshots

The scenario settings describe the situation being demoed, not the screen being viewed: what
the link offers, what was ordered, and which express-payment treatment to show. Controls that
don't apply are disabled with an explanation rather than hidden.

Before writing code to reach a screen state, check `?stage=`, the stepper, and those settings.
They can almost certainly already get there.

## Responsive checks, if you need them

`--screenshot --window-size` in headless Chrome does not give a reliable layout viewport — it
will lay a page out wider than it captures. Use an explicit CDP
`Emulation.setDeviceMetricsOverride` and compare `scrollWidth` to `clientWidth`.

That override does **not** fire a `resize` event, so anything driven by a resize listener —
`useViewport`, and so every `isMobile` branch — won't update if you change the viewport on an
already-loaded page. It looks exactly like a broken breakpoint. Navigate fresh at the target
width, or dispatch `new Event('resize')` before measuring.
