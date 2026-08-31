import React, { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   Checkout-Link flow — a fork of the single-page checkout for the
   "Checkout Link" sales channel (DES-295). A shopper arrives on a
   Blurb-hosted product page (NOT direct-to-cart), adds the book, and
   completes a guest checkout. After ordering they get a confirmation
   screen and a transactional email
   (order status + tracking + create-account-later).

   Reachable at ?experience=checkout-link. Self-contained on purpose so
   it can diverge from src/App.jsx without breaking the canonical flow.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Design tokens (mirrors src/App.jsx) ── */
const T = {
  bg: "#f6f6f6", surface: "#ffffff", surfaceSunken: "#dcdcdc", disabled: "#dcdcdc",
  border: "#989898", borderSubtle: "#d1d1d1", textBold: "#292929", textSubtle: "#464646",
  /* border-blurb-border-link-active — the DS selected-state ring on PDP selectors */
  borderActive: "#0d2f44",
  textDisabled: "#656565", textLink: "#107eb1", textError: "#bd1818", brand: "#107eb1",
  success: "#166640", errorBg: "#fdf3f3", successBg: "#f0f7f0", panel: "#f0f7fb",
  shadow: "0 2px 2px rgba(51,51,51,0.12)", radius: "4px",
};

const COUNTRIES = [
  "United States","Canada","United Kingdom","Australia","Germany","France",
  "Spain","Italy","Netherlands","Belgium","Japan","Brazil","Mexico","India","Other"
];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const CA_PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const AU_STATES = ["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"];

const COUNTRY_FIELDS = {
  "United States":  { stateLabel:"State",             stateOptions:US_STATES,    stateRequired:true,  zipLabel:"Zip code",    demo:{ address:"580 California St", city:"San Francisco", state:"CA", zip:"94104" } },
  "Canada":         { stateLabel:"Province",          stateOptions:CA_PROVINCES, stateRequired:true,  zipLabel:"Postal code", demo:{ address:"290 Bremner Blvd",  city:"Toronto",       state:"ON", zip:"M5V 3L9" } },
  "Australia":      { stateLabel:"State / Territory", stateOptions:AU_STATES,    stateRequired:true,  zipLabel:"Postcode",    demo:{ address:"1 Macquarie St",    city:"Sydney",        state:"NSW", zip:"2000" } },
  "United Kingdom": { stateLabel:"County",            stateOptions:null,         stateRequired:false, zipLabel:"Postcode",    demo:{ address:"10 Downing St",     city:"London",        state:"Greater London", zip:"SW1A 2AA" } },
};
const DEFAULT_COUNTRY_FIELDS = { stateLabel:"State / Province / Region", stateOptions:null, stateRequired:false, zipLabel:"Postal code", demo:{ address:"123 Main Street", city:"Capital City", state:"", zip:"00000" } };
const EMPTY_ADDRESS = { firstName:"", lastName:"", company:"", phone:"", country:"", address:"", address2:"", city:"", state:"", zip:"" };

/* ── Assets ── */
const BLURB_LOGO  = "/assets/blurb-logo.png";
const APPLE_PAY   = "/assets/apple-pay.svg";
const PAYPAL_IMG  = "/assets/paypal.svg";
const GPAY        = "/assets/google-pay.svg";
/* Dark-background marks for the black express buttons. Apple's is the same
   artwork in white; Google's keeps the four-colour G and turns only the wordmark
   white, which is their prescribed dark-theme treatment. The originals above are
   light-background marks and vanish on black. */
const APPLE_PAY_W = "/assets/apple-pay-white.svg";
const GPAY_W      = "/assets/google-pay-white.svg";
const PAYPAL_W    = "/assets/paypal-white.svg";
const VISA        = "/assets/visa.svg";
const MASTERCARD  = "/assets/mastercard.svg";
const AMEX        = "/assets/amex.svg";
const DISCOVER    = "/assets/discover.svg";
const BOOK_COVER  = "/assets/book-pride.png";
const BLURB_MARK  = "/assets/blurb-mark.svg";
const AUTHOR_PHOTO = "/assets/author-paige.png";
const BLURB_LOGO_EMAIL = "/assets/blurb-logo-email.png";  // full-color logo for the email header
const BOOK_SENSE    = "/assets/book-sense.png";
const BOOK_GARDNERS = "/assets/book-gardners.png";

/* Blurb brand type. Blurb self-hosts these on its own CDN (no Typekit kit);
   we reference the exact same woff2 files rather than copying them, and inject
   the @font-face rules at runtime only while this fork is mounted — so the
   original checkout never uses (or downloads) them and keeps its system font.
   Design tokens: font-sans = Proxima Nova, font-heading = Futura PT. */
const BLURB_FONT_BASE = "https://assets.blurb.com/_astro/fonts/";
const BLURB_FONT_FACES = [
  ["Proxima Nova", 400, "9e5f165193baf73b"],
  ["Proxima Nova", 500, "a587ff669d60ac38"],
  ["Proxima Nova", 600, "400006e4c98b5bb1"],
  ["Proxima Nova", 700, "18fadc50cce629f8"],
  ["Futura PT", 400, "045346bd8370b80a"],
  ["Futura PT", 500, "19328e3f43ab4ed2"],
  ["Futura PT", 600, "902c6ec6193b5f43"],
].map(([fam, wt, hash]) =>
  `@font-face{font-family:'${fam}';font-weight:${wt};font-style:normal;font-display:swap;` +
  `src:url('${BLURB_FONT_BASE}${hash}.woff2') format('woff2');}`
).join("\n");
const FONT_SANS    = "'Proxima Nova', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_HEADING = "'Futura PT', 'Futura', 'Century Gothic', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";

/* ── The single, coherent order that runs through every screen ── */
/* Same book as App.jsx's BOOK_SEED, kept in step by hand — the two files don't
   share constants by design. Change the title, author, cover or spec here and
   change it there too, or the two prototypes start demoing different products.
   The prices are deliberately NOT in step: this is a Checkout Link listing with
   its own bundle pricing. */
const PRODUCT = {
  title:  "Pride and Preconceptions",
  author: "Paige Hazelwood",
  format: "Hardcover, ImageWrap",
  paper:  "Premium Paper, matte finish",
  options:"Standard Landscape, 10×8 in (25×20 cm)",
  pages:  "20 pages",
  price:  35.0,
  img:    BOOK_COVER,
};
const ORDER_NUMBER = "11234454";
const ORDER_DATE   = "July 20, 2026";
const UPS_TRACKING = "1Z999AA10123456784";

const SHIPPING_OPTS = [
  { id:"economy",  label:"Economy",  desc:"Arrives by Jul 30", price:9.99,  arrive:"Jul 30" },
  { id:"standard", label:"Standard", desc:"Arrives by Jul 24", price:14.99, arrive:"Jul 24" },
  { id:"express",  label:"Express",  desc:"Arrives by Jul 22", price:24.99, arrive:"Jul 22" },
];
const PROMO_CODES = { BLURB10:10, SAVE20:20 };

/* ── Format: print and PDF are now separate products, not options within one ──
   FORMATS are the buyable products. LINK_VARIANTS are what the seller (or the
   AI agent that generated the link) chose to put on sale — format is a
   seller-locked attribute on a checkout link, exactly like cover type, so the
   buyer only sees a chooser when more than one format was enabled.
   "both" is a real bundle option rather than a pre-ticked add-on, so the PDF
   stays a first-class product instead of an accessory to the print order. */
const FORMATS = {
  print:   { id:"print",   label:"Printed",     price:35.00, blurb:"Hardcover, ImageWrap · Ships in 5–7 days" },
  digital: { id:"digital", label:"PDF",         price:5.00,  blurb:"Instant download · 12 MB" },
  /* Bundle is priced at the print copy plus half the PDF, so the incentive is real
     without making the PDF look like a free add-on to a print order. */
  both:    { id:"both",    label:"Printed + PDF", price:37.50, blurb:"Printed book plus an instant download" },
};
/* Bundle price is below the sum of the parts; the difference shows as its own
   summary row so the incentive is visible after the cart, not just on the PDP. */
const BUNDLE_SAVING = Math.round((FORMATS.print.price + FORMATS.digital.price - FORMATS.both.price) * 100) / 100;
const PDF_FILE = { name:"pride-and-preconceptions.pdf", size:"12 MB" };

/* Whether a checkout link can sell the PDF at all.

   Decided 2026-08-25: it can't. A checkout link is a seller sharing one book with
   their own audience; the PDF is something a maker buys for themselves. So the PDF
   stays in the regular flow and comes off the link.

   A flag rather than a deletion, because the format machinery is threaded through
   the PDP, the cart's upsell, the order summary and all three post-order screens —
   95 references to `format` alone. Everything PDF-shaped is already gated on either
   `variant === "both"` or `hasDigital(format)`, so pinning the variant to print
   turns the whole path off at once: the format chooser stops rendering
   (`chooseFormat`), the cart stops offering to add a PDF (`canAddPdf`), no PDF line
   item is built, and the post-order screens take their print branches. Same pattern
   as SHOW_PROMO_BANNER and SHOW_LOGO_PAGE_OPTION on the regular flow — one constant
   brings it back if the product decision moves. */
const SELLS_DIGITAL = false;

const ALL_LINK_VARIANTS = {
  print:   { id:"print",   label:"Printed only",  choices:["print"] },
  digital: { id:"digital", label:"PDF only",      choices:["digital"] },
  both:    { id:"both",    label:"Printed + PDF", choices:["print","digital","both"] },
};
/* What a seller can actually put on a link. Narrowed to print while
   SELLS_DIGITAL is false; the full set stays above so the flag is reversible. */
const LINK_VARIANTS = SELLS_DIGITAL
  ? ALL_LINK_VARIANTS
  : { print: ALL_LINK_VARIANTS.print };

/* One buyer, one address, everywhere the demo shows it.

   It used to differ by route: typing into the form gave reader@email.com, a social
   sign-in gave reader@gmail.com, and any screen reached without those set fell back
   to name@email.com — so the confirmation could show a different address than the
   checkout that produced it.

   `example.com` is reserved by RFC 2606 for exactly this. `email.com` is a real
   registered mail provider and the provider domains are real mailboxes, so the old
   values printed addresses that could belong to someone.

   Social sign-in returns this same address: the provider is how the buyer
   authenticated, not a different mailbox. */
const DEMO_BUYER_EMAIL = "alex.reader@example.com";
/* What the buyer lands on. A single-format link has nothing to choose; a
   both-format link defaults to Print — the majority intent and higher value. */
const defaultFormat = variant => (variant === "digital" ? "digital" : "print");

const hasPrint   = f => f === "print" || f === "both";
const hasDigital = f => f === "digital" || f === "both";

/* One order line per product. Print carries the quantity; a PDF is always a
   single file per order, so its qty is pinned to 1. */
function lineItems(format, qty) {
  const items = [];
  if (hasPrint(format)) items.push({
    id:"print", fulfil:"ship", title:PRODUCT.title, kind:`Photo Book (${PRODUCT.format})`,
    lines:[PRODUCT.options, PRODUCT.pages], qty, unit:FORMATS.print.price, total:FORMATS.print.price * qty,
  });
  if (hasDigital(format)) items.push({
    id:"digital", fulfil:"download", title:`${PRODUCT.title} (PDF)`, kind:"Digital PDF",
    lines:["Instant download", `${PDF_FILE.size} · ${PRODUCT.pages}`], qty:1,
    unit:FORMATS.digital.price, total:FORMATS.digital.price,
  });
  return items;
}
const subtotalOf   = (format, qty) => lineItems(format, qty).reduce((s, i) => s + i.total, 0);
const savingOf     = format => (format === "both" ? BUNDLE_SAVING : 0);
const FULFIL_LABEL = { ship:"Shipping to you", download:"Available to download" };

/* ═══════════════════════════ Icons ═══════════════════════════ */
function Ms({ name, size=24, color, fill=0, style }) {
  return <span className="ms" style={{ fontSize:size, color:color||T.textBold, fontVariationSettings:`'FILL' ${fill},'wght' 400,'GRAD' 0,'opsz' 24`, ...style }}>{name}</span>;
}
function IconCheckCircle({ size=24, color=T.success }) {
  // Outlined green check-circle (Figma 10978:39664), not a filled disc
  return <span className="ms" style={{ fontSize:size, color, lineHeight:1, flexShrink:0,
    fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>;
}

/* ── Social brand glyphs ── */
function GoogleGlyph({ size=20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display:"block", flexShrink:0 }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
    </svg>
  );
}
function AppleGlyph({ size=20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#000" style={{ display:"block", flexShrink:0 }}>
      <path d="M16.36 12.78c-.02-2.07 1.69-3.06 1.77-3.11-.96-1.41-2.46-1.6-3-1.62-1.27-.13-2.49.75-3.14.75-.65 0-1.65-.73-2.71-.71-1.39.02-2.68.81-3.4 2.06-1.45 2.52-.37 6.25 1.04 8.29.69 1 1.51 2.12 2.58 2.08 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.71.65 1.12-.02 1.83-1.02 2.51-2.02.79-1.16 1.12-2.28 1.13-2.34-.02-.01-2.17-.83-2.19-3.29zM14.3 6.25c.57-.7.96-1.66.85-2.63-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.6-.87 2.54.92.07 1.87-.47 2.44-1.15z"/>
    </svg>
  );
}
function FacebookGlyph({ size=20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display:"block", flexShrink:0 }}>
      <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/>
    </svg>
  );
}

/* ═══════════════════════════ Primitives ═══════════════════════════ */
function Divider() { return <div style={{ height:1, background:"#e0e0e0", width:"100%", flexShrink:0 }} />; }

function Input({ label, placeholder, hint, error, required, type="text", value, onChange, rightIcon, onClick, disabled }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && (
        <label style={{ fontSize:15, fontWeight:600, color:T.textBold }}>
          {label}{required && <span style={{ color:T.textError }}> *</span>}
        </label>
      )}
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <input
          type={type} placeholder={placeholder} value={value||""} disabled={disabled}
          onChange={e => onChange && onChange(e.target.value)} onClick={onClick}
          style={{ border:`1px solid ${error ? T.textError : T.border}`, borderRadius:T.radius,
            padding:"9px 11px", paddingRight: rightIcon ? 38 : 11, fontSize:15,
            color: disabled ? T.textSubtle : T.textBold, background: disabled ? "#f0f0f0" : T.surface,
            cursor: disabled ? "not-allowed" : "text", width:"100%" }}
        />
        {rightIcon && <div style={{ position:"absolute", right:10, display:"flex", alignItems:"center" }}>{rightIcon}</div>}
      </div>
      {hint && !error && <p style={{ fontSize:13, color:T.textSubtle }}>{hint}</p>}
      {error && <p style={{ fontSize:13, color:T.textError }}>{error}</p>}
    </div>
  );
}

function SelectInput({ label, required, value, onChange, options, placeholder="Select" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && (
        <label style={{ fontSize:15, fontWeight:600, color:T.textBold }}>
          {label}{required && <span style={{ color:T.textError }}> *</span>}
        </label>
      )}
      <select value={value||""} onChange={e => onChange && onChange(e.target.value)}
        style={{ border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"9px 11px",
          fontSize:15, color:value ? T.textBold : "#888", background:T.surface, width:"100%", appearance:"auto" }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Combobox({ label, required, value, onChange, options, placeholder="Start typing to search…", error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  const choose = o => { onChange && onChange(o); setQuery(""); setOpen(false); };
  return (
    <div ref={ref} style={{ display:"flex", flexDirection:"column", gap:5, position:"relative" }}>
      {label && (
        <label style={{ fontSize:15, fontWeight:600, color:T.textBold }}>
          {label}{required && <span style={{ color:T.textError }}> *</span>}
        </label>
      )}
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <input value={open ? query : (value || "")} placeholder={value || placeholder}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          style={{ border:`1px solid ${error ? T.textError : T.border}`, borderRadius:T.radius,
            padding:"9px 11px", paddingRight:44, fontSize:15, color:T.textBold, background:T.surface, width:"100%" }}
        />
        <span className="ms" style={{ position:"absolute", right:14, pointerEvents:"none", color:T.textBold, fontSize:22 }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </div>
      {open && (
        <div style={{ border:`1px solid ${T.border}`, borderRadius:T.radius, marginTop:2,
          maxHeight:200, overflowY:"auto", background:T.surface, boxShadow:"0 4px 12px rgba(0,0,0,.08)" }}>
          {filtered.length === 0 && <div style={{ padding:"9px 11px", fontSize:14, color:T.textSubtle }}>No matches</div>}
          {filtered.map(o => (
            <div key={o} onMouseDown={() => choose(o)}
              style={{ padding:"9px 11px", fontSize:15, color:T.textBold, cursor:"pointer",
                background: o === value ? T.panel : T.surface }}
              onMouseEnter={e => e.currentTarget.style.background = o === value ? T.panel : "#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background = o === value ? T.panel : T.surface}>
              {o}
            </div>
          ))}
        </div>
      )}
      {error && <p style={{ fontSize:13, color:T.textError }}>{error}</p>}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled, fullWidth }) {
  const base = {
    borderRadius:T.radius, fontSize:15, fontWeight:600, cursor:disabled ? "not-allowed" : "pointer",
    width:fullWidth ? "100%" : undefined, padding:"10px 24px", transition:"opacity .15s", border:"none",
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
  };
  const variants = {
    primary:   { background:T.brand, color:"#fff" },
    secondary: { background:"transparent", color:T.brand, border:`1px solid ${T.brand}` },
    disabled:  { background:T.disabled, color:T.textDisabled },
  };
  const s = disabled ? variants.disabled : variants[variant];
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...s }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity=".82"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity="1"; }}>
      {children}
    </button>
  );
}

function Alert({ type="error", message }) {
  const c = {
    error:   { bg:T.errorBg,   border:T.textError, color:T.textError },
    success: { bg:T.successBg, border:T.success,   color:T.success   },
    info:    { bg:T.panel,     border:T.brand,     color:"#0a5a80"   },
  }[type];
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:T.radius, padding:"10px 14px", fontSize:14, color:c.color, lineHeight:1.5 }}>
      {message}
    </div>
  );
}

function Collapse({ open, children }) {
  return (
    <div aria-hidden={!open} style={{ display:"grid", gridTemplateRows: open ? "1fr" : "0fr",
      opacity: open ? 1 : 0, transition:"grid-template-rows .3s ease, opacity .25s ease" }}>
      <div style={{ overflow:"hidden", minHeight:0 }}>{children}</div>
    </div>
  );
}

function AutoHeight({ children }) {
  const ref = useRef(null);
  const [h, setH] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div style={{ height: h == null ? "auto" : h, overflow:"hidden", transition:"height .3s ease",
      marginLeft:-4, marginRight:-4, paddingLeft:4, paddingRight:4 }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

function AccordionSection({ title, open, onToggle, disabled, completed, summary, children }) {
  const showSummary  = completed && !open;
  const labelColor   = disabled ? T.textDisabled : T.textBold;
  const chevronColor = disabled ? T.textDisabled : T.textBold;
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, overflow:"hidden" }}>
      <button onClick={disabled ? undefined : onToggle}
        style={{ width:"100%", display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          padding:"16px 24px", background:"none", border:"none", textAlign:"left", cursor: disabled ? "default" : "pointer" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, flex:1, minWidth:0 }}>
          {completed && <div style={{ paddingTop:2, flexShrink:0 }}><IconCheckCircle size={24} /></div>}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:700, lineHeight:1.4, color:labelColor }}>{title}</div>
            <Collapse open={showSummary}>
              <div style={{ fontSize:13, color:T.textSubtle, marginTop:2 }}>{summary}</div>
            </Collapse>
          </div>
        </div>
        {/* Chevron only — the "Modify" link that used to replace it on a completed
            section said in a word what the chevron already says, and it was the one
            control on the page that changed shape depending on state.

            paddingTop:2 matches the completed check icon opposite, so both 24px
            glyphs sit on the title's first line instead of centring themselves
            against a block that grows to two lines when the summary appears. */}
        <span style={{ marginLeft:12, flexShrink:0, display:"flex", alignItems:"flex-start", paddingTop:2 }}>
          {<Ms name={open ? "expand_less" : "expand_more"} color={chevronColor} />}
        </span>
      </button>
      <Collapse open={open}>
        <div style={{ padding:"0 24px 24px" }}>{children}</div>
      </Collapse>
    </div>
  );
}

function useViewport() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width, isMobile: width < 768, isTablet: width >= 768 && width < 1024, isDesktop: width >= 1024 };
}

/* ═══════════════════════════ Money helper ═══════════════════════════ */
const money = n => `$${n.toFixed(2)}`;

/* ═══════════════════════════ Shared chrome ═══════════════════════════ */
/* Header — full Blurb logo centered on the page background, matching the
   original first-time-user checkout flow. Used across all checkout-link
   views (checkout, confirmation, email). */
function Header() {
  const { isMobile } = useViewport();
  return (
    <div style={{ background:T.bg, display:"flex", alignItems:"center", justifyContent:"center",
      padding:`14px ${isMobile ? 20 : 60}px`, flexShrink:0 }}>
      <img src={BLURB_LOGO} alt="Blurb" style={{ height:44, width:"auto", display:"block" }} />
    </div>
  );
}

/* ── Footer ──
   The Codex Foundation `Footer`, context = Checkout, across its three device
   variants: desktop 12442:88349, tablet 12442:88413, mobile 12442:88545. The
   component's Trust Bar is hidden in this context, so only the legal bar renders
   (the PDP uses PdpFooter below, which does show a trust bar).

   The variants reorder rather than reflow, so this is a switch, not a flex-wrap:
     desktop  one row — links left (copyright first), Secure payment right
     tablet   Secure payment centred above a full-width justified row of links
     mobile   Secure payment, links centred and wrapped WITHOUT the copyright,
              then the copyright alone on the last line

   Was a single unresponsive row on #1c1c1c in #cfcfcf text; the design is #292929
   with white. The unused `light` prop is gone — nothing ever passed it.

   Duplicated in App.jsx — keep the two in step. */
const FOOTER_BG    = "#292929";
const FOOTER_LINKS = ["Privacy policy", "Return policy", "Terms of service", "Cookie policy", "Support"];
const FOOTER_COPY  = "©2015-2026 RPI Print, Inc.";
const footerText   = { fontSize:12, lineHeight:1.4, color:"#fff", whiteSpace:"nowrap" };

function FooterLink({ children }) {
  return (
    <a href="#" onClick={e => e.preventDefault()} style={{ ...footerText, textDecoration:"none" }}
      onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
      onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>{children}</a>
  );
}

function SecurePayment() {
  return (
    <span style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
      <Ms name="lock" size={16} color="#fff" />
      <span style={footerText}>Secure payment</span>
    </span>
  );
}

function Footer() {
  const { isMobile, isTablet } = useViewport();
  const row = { background:FOOTER_BG, width:"100%", display:"flex", flexShrink:0 };

  if (isMobile) return (
    <div style={{ ...row, flexDirection:"column", alignItems:"center" }}>
      <div style={{ ...row, justifyContent:"center", padding:"16px 0 8px" }}><SecurePayment /></div>
      {/* The copyright is not among the links on mobile — it gets its own line below */}
      <div style={{ ...row, justifyContent:"center", flexWrap:"wrap", rowGap:8, columnGap:12, padding:"8px 24px" }}>
        {FOOTER_LINKS.map(l => <FooterLink key={l}>{l}</FooterLink>)}
      </div>
      <div style={{ ...row, justifyContent:"center", padding:"8px 24px 16px" }}>
        <span style={footerText}>{FOOTER_COPY}</span>
      </div>
    </div>
  );

  if (isTablet) return (
    <div style={{ ...row, flexDirection:"column", justifyContent:"center", padding:"16px 40px" }}>
      <div style={{ display:"flex", justifyContent:"center", paddingBottom:16 }}><SecurePayment /></div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <span style={footerText}>{FOOTER_COPY}</span>
        {FOOTER_LINKS.map(l => <FooterLink key={l}>{l}</FooterLink>)}
      </div>
    </div>
  );

  return (
    <div style={{ ...row, alignItems:"center", gap:40, padding:"16px 80px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:24 }}>
        <span style={footerText}>{FOOTER_COPY}</span>
        {FOOTER_LINKS.map(l => <FooterLink key={l}>{l}</FooterLink>)}
      </div>
      <div style={{ flex:1, display:"flex", justifyContent:"flex-end", minWidth:0 }}><SecurePayment /></div>
    </div>
  );
}

/* PDP footer — matches Figma node 4401:3325 exactly:
   a white trust bar (Blurb mark + "Printed and shipped by Blurb") stacked
   over a dark #292929 legal bar (copyright + 5 links, 12px white, 24px gaps). */
function PdpFooter() {
  const { isMobile } = useViewport();
  const padX = isMobile ? 20 : 80;
  const legalLinks = ["Privacy policy", "Return policy", "Terms of Service", "Cookie Policy", "Support"];
  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", background:"#292929" }}>
      {/* Trust bar */}
      <div style={{ background:T.surface, display:"flex", alignItems:"center", gap:40, padding:`16px ${padX}px`, width:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ display:"flex", padding:"2px 3px" }}>
            <img src={BLURB_MARK} alt="Blurb" style={{ height:24, width:"auto", display:"block" }} />
          </span>
          <span style={{ fontSize:14, color:T.textBold, lineHeight:1.4 }}>Printed and shipped by Blurb</span>
        </div>
      </div>
      {/* Legal bar */}
      <div style={{ background:"#292929", display:"flex", alignItems:"center", gap:40, padding:`16px ${padX}px`, width:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap: isMobile ? "wrap" : "nowrap",
          fontSize:12, color:"#ffffff", lineHeight:1.4, whiteSpace:"nowrap" }}>
          <span>©2015-2026 RPI Print, Inc.</span>
          {legalLinks.map(l => (
            <a key={l} href="#" style={{ color:"#ffffff", textDecoration:"none" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>{l}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div style={{ display:"flex", alignItems:"center", width:"100%" }}>
      <div style={{ flex:1, height:1, background:"#e0e0e0" }} />
      <span style={{ padding:"0 14px", fontWeight:700, color:"#595959", fontSize:18, whiteSpace:"nowrap" }}>OR</span>
      <div style={{ flex:1, height:1, background:"#e0e0e0" }} />
    </div>
  );
}

/* ═══════════════════════════ PRODUCT PAGE (PDP) ═══════════════════════════ */
function PdpNav({ cartCount, onCartClick }) {
  return (
    <div style={{ background:T.surface, borderBottom:"1px solid #eee", display:"flex", alignItems:"center",
      justifyContent:"flex-end", padding:"10px 40px", flexShrink:0, position:"sticky", top:0, zIndex:20 }}>
      {/* No Blurb logo on the hosted PDP — the logo appears in checkout */}
      <button onClick={onCartClick} aria-label="Open cart"
        style={{ position:"relative", background:"none", border:"none", cursor:"pointer", padding:6, display:"flex" }}>
        <Ms name="shopping_cart" size={24} color={T.brand} />
        {cartCount > 0 && (
          <span style={{ position:"absolute", top:-2, right:-2, background:T.brand, color:"#fff",
            borderRadius:10, minWidth:16, height:16, fontSize:10, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{cartCount}</span>
        )}
      </button>
    </div>
  );
}

function QuantityStepper({ qty, setQty, size=40, onBelowMin }) {
  const btn = { width:48, height:size, border:`1px solid ${T.border}`, background:T.surface,
    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" };
  // At quantity 1, decrementing removes the item (when onBelowMin is provided).
  const dec = () => { if (qty <= 1) { onBelowMin ? onBelowMin() : setQty(1); } else setQty(qty - 1); };
  return (
    <div style={{ display:"flex", height:size }}>
      <button style={{ ...btn, borderRadius:"4px 0 0 4px", marginRight:-1 }} onClick={dec} aria-label="Decrease quantity"><Ms name="remove" size={20} /></button>
      <div style={{ ...btn, width:48, cursor:"default", fontSize:18, color:T.textBold, marginRight:-1 }}>{qty}</div>
      <button style={{ ...btn, borderRadius:"0 4px 4px 0" }} onClick={() => setQty(qty+1)} aria-label="Increase quantity"><Ms name="add" size={20} /></button>
    </div>
  );
}

/* Placeholder book page — lorem ipsum body text + page number (not the real
   book's content), used by the flipbook. */
const LOREM = ("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. ").repeat(4);
const BOOK_FONT = "'Georgia', 'Times New Roman', serif";
const slice = (seed, len) => { const s = (seed * 197) % (LOREM.length - len - 1); return LOREM.slice(s, s + len); };
function PreviewPage({ n }) {
  if (n < 2 || n > 15) return <div style={{ width:"100%", height:"100%", background:"#fff" }} />;
  const chapterOpener = n % 2 === 0;        // left (even) pages open a chapter
  const chapter = n / 2;
  const bodyStyle = { margin:0, fontSize:"clamp(6px,2.5cqw,13px)", lineHeight:1.5, textAlign:"justify",
    textIndent:"8%", overflow:"hidden" };
  return (
    <div style={{ width:"100%", height:"100%", background:"#fff", padding:"9% 9% 6%", boxSizing:"border-box",
      display:"flex", flexDirection:"column", fontFamily:BOOK_FONT, color:"#2b2b2b", overflow:"hidden" }}>
      {chapterOpener ? (
        <>
          <div style={{ height:"27%", flexShrink:0 }} />
          <div style={{ fontFamily:BOOK_FONT, fontWeight:700, fontSize:"clamp(30px,11cqw,86px)", lineHeight:1, marginBottom:"12%" }}>{chapter}</div>
          <p style={{ ...bodyStyle }}>{slice(chapter * 13, 360)}</p>
          <div style={{ flex:1 }} />
        </>
      ) : (
        <p style={{ ...bodyStyle, flex:1 }}>{slice(n, 1000)}</p>
      )}
      <div style={{ fontSize:"clamp(8px,1.5cqw,11px)", color:"#777", marginTop:"4%",
        textAlign: chapterOpener ? "left" : "right" }}>{n}</div>
    </div>
  );
}

/* Two-page book spread with a CSS 3D page-turn (animation reference only —
   Blurb's live flipbook). Matches Figma 4401:3307's static look. */
function Flipbook({ maxWidth = 900 }) {
  const LAST = 6;   // 7 spreads: [2,3] … [14,15] (page 1 is the title page, not previewed)
  const [spread, setSpread] = useState(0);
  const [flip, setFlip]     = useState(null);  // "next" | "prev"
  const [angle, setAngle]   = useState(0);

  const leftNum = spread * 2 + 2;   // left pages even (verso)
  const rightNum = leftNum + 1;     // right pages odd (recto)

  useEffect(() => {
    if (!flip) return;
    const id = requestAnimationFrame(() => setAngle(flip === "next" ? -180 : 180));
    return () => cancelAnimationFrame(id);
  }, [flip]);

  const start = dir => {
    if (flip) return;
    if (dir === "next" && spread >= LAST) return;
    if (dir === "prev" && spread <= 0) return;
    setAngle(0);
    setFlip(dir);
  };
  const commit = () => {
    if (!flip) return;
    setSpread(s => s + (flip === "next" ? 1 : -1));
    setFlip(null);
    setAngle(0);
  };

  // Underlay pages sit behind the turning leaf; pick them so nothing flickers
  // at the start or end of the turn.
  const underLeft  = flip === "prev" ? leftNum - 2 : leftNum;
  const underRight = flip === "next" ? rightNum + 2 : rightNum;
  const leafFront  = flip === "next" ? rightNum : leftNum;
  const leafBack   = flip === "next" ? leftNum + 2 : rightNum - 2;

  const circle = (disabled) => ({
    width:40, height:40, borderRadius:"50%", background:"#fff",
    border:`1px solid ${disabled ? T.border : T.textBold}`,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
    display:"flex", alignItems:"center", justifyContent:"center",
  });
  const face = { position:"absolute", inset:0, backfaceVisibility:"hidden", overflow:"hidden", background:"#fff", containerType:"inline-size" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center", width:"100%" }}>
      <div style={{ position:"relative", width:"100%", maxWidth, aspectRatio:"900 / 573", perspective:2000, margin:"0 auto" }}>
        {/* Static spread underneath the leaf */}
        <div style={{ position:"absolute", inset:0, display:"flex", borderRadius:8, overflow:"hidden",
          boxShadow:"0 10px 30px rgba(0,0,0,.15)", background:"#fff" }}>
          <div style={{ width:"50%", height:"100%", containerType:"inline-size", borderRight:"1px solid #eee" }}><PreviewPage n={underLeft} /></div>
          <div style={{ width:"50%", height:"100%", containerType:"inline-size" }}><PreviewPage n={underRight} /></div>
        </div>
        {/* Center gutter shadow */}
        <div style={{ position:"absolute", top:0, bottom:0, left:"50%", width:40, transform:"translateX(-50%)",
          background:"linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,.10), rgba(0,0,0,0))", pointerEvents:"none", zIndex:3 }} />
        {/* Turning leaf */}
        {flip && (
          <div onTransitionEnd={commit}
            style={{ position:"absolute", top:0, height:"100%", width:"50%",
              left: flip === "next" ? "50%" : 0,
              transformStyle:"preserve-3d",
              transformOrigin: flip === "next" ? "left center" : "right center",
              transform:`rotateY(${angle}deg)`, transition:"transform .6s ease", zIndex:4 }}>
            <div style={{ ...face, boxShadow:"0 0 22px rgba(0,0,0,.14)" }}><PreviewPage n={leafFront} /></div>
            <div style={{ ...face, transform:"rotateY(180deg)" }}><PreviewPage n={leafBack} /></div>
          </div>
        )}
      </div>
      {/* Counter */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <button onClick={() => start("prev")} disabled={spread <= 0} aria-label="Previous pages" style={circle(spread <= 0)}>
          <Ms name="chevron_left" size={22} color={T.textBold} />
        </button>
        <span style={{ background:"#f4f4f4", borderRadius:4, padding:"4px 10px", fontSize:14, fontWeight:600, color:T.textBold }}>{leftNum}/15</span>
        <button onClick={() => start("next")} disabled={spread >= LAST} aria-label="Next pages" style={circle(spread >= LAST)}>
          <Ms name="chevron_right" size={22} color={T.textBold} />
        </button>
      </div>
    </div>
  );
}

/* Book-preview section: header (title + "View fullscreen") over the flipbook. */
function BookPreview() {
  const { isMobile } = useViewport();
  const [fullscreen, setFullscreen] = useState(false);
  // Lock body scroll while the fullscreen viewer is open
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = e => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [fullscreen]);
  return (
    <div style={{ marginTop:56, display:"flex", flexDirection:"column", gap:48 }}>
      <div style={{ display:"flex", alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between",
        gap:16, flexWrap:"wrap", borderBottom:"1px solid #dcdcdc", paddingBottom:12 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize: isMobile ? 32 : 44, fontWeight:500, lineHeight:1.2, color:T.textBold }}>Book preview</h2>
          <p style={{ fontSize:18, color:T.textSubtle, lineHeight:1.4 }}>First 15 pages</p>
        </div>
        <button onClick={() => setFullscreen(true)}
          style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:`1px solid ${T.textBold}`,
          borderRadius:4, padding:"8px 24px", cursor:"pointer", fontSize:16, fontWeight:600, color:T.textBold }}>
          <Ms name="fullscreen" size={24} color={T.textBold} /> View fullscreen
        </button>
      </div>
      <Flipbook />

      {fullscreen && (
        <div onClick={() => setFullscreen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(20,20,20,.92)", zIndex:300,
            display:"flex", alignItems:"center", justifyContent:"center", padding:"64px 24px" }}>
          <button onClick={() => setFullscreen(false)} aria-label="Close fullscreen"
            style={{ position:"absolute", top:20, right:24, background:"none", border:"none", cursor:"pointer", display:"flex" }}>
            <Ms name="close" size={32} color="#fff" />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:1200 }}>
            <Flipbook maxWidth={1200} />
          </div>
        </div>
      )}
    </div>
  );
}

/* Content for the Format "Details" panel — the questions a buyer can't answer from a
   tile, ordered by how much trouble getting them wrong causes. Values written as
   { tbc } are open business decisions, NOT product facts: they render as visibly
   provisional so nobody screenshots them into a deck as settled. Replace with real
   values (and drop TbcValue) once signed off. */
const FORMAT_DETAIL_ROWS = [
  { label:"What you get",
    print:  "Hardcover with ImageWrap cover, premium matte paper, 10×8 in (25×20 cm), 20 pages",
    digital:`A single PDF file · ${PDF_FILE.size} · 20 pages` },
  { label:"How it reaches you",
    print:  "Printed to order, then shipped — 5–7 days",
    digital:"Downloads straight after payment, and stays on your order page" },
  { label:"Page layout",
    print:  "Bound as facing-page spreads",
    digital:{ tbc:"single pages, or spreads as printed" } },
  { label:"Printing it yourself",
    print:  "—",
    digital:{ tbc:"whether personal printing is permitted" } },
  { label:"How long you can download it",
    print:  "—",
    digital:{ tbc:"download window, and any limit on downloads" } },
  { label:"Changes and refunds",
    print:  "Cancel or change within 3 hours of ordering",
    digital:"Non-refundable — it can't be canceled once bought" },
];

/* Marks a value as an unresolved decision rather than a product fact. Dashed and
   labelled so it reads as provisional at a glance, in a screenshot, and in print. */
function TbcValue({ children }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 8px", borderRadius:T.radius,
      background:T.bg, border:`1px dashed ${T.border}`, fontSize:14, lineHeight:1.4, color:T.textSubtle }}>
      <Ms name="help" size={16} color={T.textSubtle} /> To be confirmed — {children}
    </span>
  );
}

function DetailCell({ label, value, showLabel }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:0 }}>
      {showLabel && (
        <span style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".04em", color:T.textSubtle }}>{label}</span>
      )}
      {typeof value === "string"
        ? <span style={{ fontSize:16, lineHeight:1.4, color:T.textBold }}>{value}</span>
        : <TbcValue>{value.tbc}</TbcValue>}
    </div>
  );
}

/* Opened from the "Details" affordance beside the Format label — and from the
   single-format disclosure too, since a PDF-only buyer needs these facts most and
   has no selector to open them from. */
function FormatDetailsModal({ onClose }) {
  const { isDesktop } = useViewport();
  const cols = isDesktop ? "180px 1fr 1fr" : "1fr";
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:8, maxWidth:760, width:"100%", maxHeight:"88vh",
          overflowY:"auto", boxShadow:"0 8px 40px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12,
          padding:"20px 24px", borderBottom:`1px solid ${T.borderSubtle}` }}>
          <div>
            <p style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:500, lineHeight:1.2, color:T.textBold }}>Printed and PDF compared</p>
            <p style={{ fontSize:14, lineHeight:1.4, color:T.textSubtle, marginTop:4 }}>
              Two separate products — buy either on its own, or both together.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:0, flexShrink:0 }}>
            <Ms name="close" size={22} color={T.textBold} />
          </button>
        </div>

        <div style={{ padding:"4px 24px 24px" }}>
          {isDesktop && (
            <div style={{ display:"grid", gridTemplateColumns:cols, gap:20, padding:"12px 0",
              borderBottom:`1px solid ${T.borderSubtle}` }}>
              <span />
              <span style={{ fontSize:16, fontWeight:700, lineHeight:"24px", color:T.textBold }}>Printed</span>
              <span style={{ fontSize:16, fontWeight:700, lineHeight:"24px", color:T.textBold }}>PDF</span>
            </div>
          )}
          {FORMAT_DETAIL_ROWS.map(row => (
            <div key={row.label} style={{ display:"grid", gridTemplateColumns:cols,
              gap: isDesktop ? 20 : 10, padding:"16px 0", borderBottom:`1px solid ${T.borderSubtle}` }}>
              <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>{row.label}</span>
              <DetailCell label="Printed" value={row.print} showLabel={!isDesktop} />
              <DetailCell label="PDF"   value={row.digital} showLabel={!isDesktop} />
            </div>
          ))}
          <p style={{ fontSize:13, lineHeight:1.5, color:T.textSubtle, marginTop:16 }}>
            Dashed rows are open decisions rather than product facts, and need sign-off before this page ships.
          </p>
        </div>
      </div>
    </div>
  );
}

/* "Text Selector - PDP" from the Codex Foundation design system (node 7845:28812):
   white tile, 1px #989898 border, and on selection a 2px #0d2f44 ring INSTEAD of the
   border, so the tile doesn't shift by a pixel. Label is 16px, semibold by default
   and bold when selected. Padding 12px/16px, 4px radius, laid out in an 8px wrap
   grid. The DS fixes the width at 290px because its column is 588px; here the tile
   flexes from a 240px basis so it still lands two-up on desktop and one-up on mobile
   without overflowing the narrower prototype column. */
function DsSelectorTile({ selected, onSelect, label, sub }) {
  return (
    <button onClick={onSelect} aria-pressed={selected}
      style={{ flex:"1 1 240px", minWidth:0, minHeight:48, padding:"12px 16px", borderRadius:T.radius,
        background:T.surface, cursor:"pointer", textAlign:"center", overflow:"hidden",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
        border: selected ? "none" : `1px solid ${T.border}`,
        boxShadow: selected ? `0 0 0 2px ${T.borderActive}` : "none" }}>
      <span style={{ fontSize:16, fontWeight: selected ? 700 : 600, lineHeight:"24px", color:T.textBold }}>{label}</span>
      {sub && <span style={{ fontSize:14, lineHeight:"20px", color:T.textSubtle }}>{sub}</span>}
    </button>
  );
}

/* Format chooser — only rendered when the seller enabled more than one format.
   Three mutually exclusive options with every price on screen, so PDF reads as its
   own product rather than a tick-box add-on to the print order.

   Follows the DS selection-section pattern: a top rule with 24px rhythm, a Title
   block holding the label, an Info/Details affordance and a line naming the current
   choice, then the selector tiles. One deliberate deviation — the DS tile holds a
   single centred label, and these carry a price beneath it, so minHeight replaces
   the DS fixed 48px. Several DS tiles already omit that fixed height, so the padding
   rhythm still holds. */
function FormatChooser({ format, setFormat, onDetails }) {
  const current = FORMATS[format];
  return (
    <div style={{ borderTop:`1px solid ${T.borderSubtle}`, paddingTop:24, width:"100%",
      display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>Format</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <Ms name="info" size={16} color={T.textBold} />
            <a href="#" onClick={e => { e.preventDefault(); onDetails(); }}
              style={{ fontSize:16, fontWeight:600, lineHeight:1.4, color:T.textLink, textDecoration:"underline" }}>Details</a>
          </span>
        </div>
        {/* DS "dynamic name" line — states the current choice and what it means */}
        <p style={{ fontSize:16, lineHeight:1.4, color:T.textBold }}>
          {current.label} ({money(current.price)}) — {current.blurb}
        </p>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, width:"100%" }}>
        {ALL_LINK_VARIANTS.both.choices.map(id => {
          const f = FORMATS[id];
          return (
            <DsSelectorTile key={id} selected={format === id} onSelect={() => setFormat(id)}
              label={f.label}
              sub={id === "both" ? `${money(f.price)} · save ${money(BUNDLE_SAVING)}` : money(f.price)} />
          );
        })}
      </div>
    </div>
  );
}

/* Which wallets the PDP offers, in priority order.

   These are NOT mutually exclusive: Google Pay is a JS API that works in Safari on
   iOS/macOS too, and PayPal has no device gating at all, so an iPhone in Safari
   genuinely offers all three. Only Apple Pay is truly gated (Apple platforms, plus
   Chrome on macOS). So availability is additive and all of it is shown — ordering
   only decides which mark sits leftmost.

   Order is by likely completion: the platform-native wallet leads (already
   provisioned, biometric confirm), then the other device wallet, then PayPal.

   In production availability comes from ApplePaySession.canMakePayments() and the
   Payment Request API's canMakePayment(); UA sniffing stands in here. Returns []
   on first paint so we never flash the wrong brand. */
function useWallets() {
  const [wallets, setWallets] = useState([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const applePlatform = /Mac|iPhone|iPad|iPod/i.test(ua);
    const available = [];
    if (window.ApplePaySession || applePlatform) available.push("Apple Pay");
    available.push("Google Pay");   // Safari included — not an Apple-vs-Google split
    available.push("PayPal");
    const rank = w => w === "PayPal" ? 2
      : (applePlatform ? (w === "Apple Pay" ? 0 : 1) : (w === "Google Pay" ? 0 : 1));
    setWallets([...available].sort((a, b) => rank(a) - rank(b)));
  }, []);
  return wallets;
}

/* Wallet brand treatments are mandated by each provider, so these don't follow the
   Blurb button tokens. Each `img` is the mark made for that button's own fill.

   All three sit on black, matching the checkout wireframes. PayPal was on its
   recommended gold, which is a defensible reading of its own guidelines, but a
   row of two black buttons and one yellow one reads as an accident rather than a
   choice — and this row appears beside the checkout's, which is black. Black
   takes PayPal's reversed mark; the full-colour one disappears against it.

   No per-wallet widths: sizing a mark by width deforms it the moment the width
   doesn't match the artwork's own ratio, which is exactly what the old 48/42/56
   boxes did — PayPal's wordmark is 3.76:1, so a 56×20 box rendered it a quarter
   shorter than the other two. Height is the only dimension set; see WalletMark.

   Kept in step with WALLET_BUTTONS in App.jsx by hand. */
const WALLET_STYLE = {
  "Apple Pay":  { img:APPLE_PAY_W, bg:"#000000", fg:"#ffffff" },
  "Google Pay": { img:GPAY_W,      bg:"#000000", fg:"#ffffff" },
  "PayPal":     { img:PAYPAL_W,    bg:"#000000", fg:"#ffffff" },
};

/* Each brand says the same thing about its own mark: use the supplied artwork,
   don't redraw it, don't change its proportions, keep clear space around it. Both
   dimensions are left to `auto` under max caps so the browser preserves the
   intrinsic ratio — the three marks then share an optical size and scale down
   together on a narrow screen instead of one deforming.

   8px of clear space on every side is the tightest any of them should be: Google
   asks for 8dp around the payment button and half its cap-G around the mark.

   Verified against the Google Pay brand guidelines and the PayPal SDK style
   reference (gold recommended). Apple's HIG pages are script-rendered and couldn't
   be read directly; this uses Apple's documented black style with their supplied
   dark-ground artwork, which is the conservative reading. */
const WALLET_CLEAR = 8;

function WalletMark({ src, height = 20 }) {
  /* Explicit height with `width:auto` — the browser derives the width from the
     artwork's own ratio, so the mark can't be squashed. Deliberately no
     `maxWidth:100%`: inside a content-sized flex wrapper the percentage has no
     definite width to resolve against and collapses the mark to nothing. */
  return (
    <img src={src} alt="" aria-hidden="true"
      style={{ display:"block", flexShrink:0, height, width:"auto" }} />
  );
}

/* 40px tall to match Add to cart and the design system's Button (Codex Foundation
   node 7850:31724 — py-2 over a 24px line box). Express reads as secondary through
   its position in the stack, not by being a different size: the DS Buttons pattern
   (7850:31720) is full-width buttons stacked with a 16px gap, and shrinking one of
   them would break that rhythm. */
const BTN_H = 40;

/* `hidden` is a wallet that exists but hasn't been revealed yet. It stays mounted
   so the reveal can be animated: growing from zero width beats appearing, and a
   button that mounts mid-transition has no width to grow from. Kept out of the
   tab order and off the pointer while it's collapsed.

   Widths are driven by `flexGrow` rather than the row's `gap`, because gap can't
   be animated per item and a zero-width button would still be holding its share
   of it — the collapsed row would carry 16px of dead space. */
function WalletButton({ wallet, compact, hidden, first, onPress }) {
  const s = WALLET_STYLE[wallet];
  return (
    /* The mark is aria-hidden, so this label is the button's only accessible name */
    <button onClick={() => onPress(wallet)} aria-label={`Buy now with ${wallet}`}
      aria-hidden={hidden} tabIndex={hidden ? -1 : 0}
      style={{ flexGrow: hidden ? 0 : 1, flexBasis:0, minWidth:0, overflow:"hidden",
        marginLeft: first || hidden ? 0 : 8, opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        height:BTN_H, padding: hidden ? 0 : `0 ${WALLET_CLEAR}px`,
        borderRadius:T.radius, border:"none", cursor:"pointer",
        background:s.bg, color:s.fg, fontSize:16, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center", gap:0,
        transition:"flex-grow .3s ease, margin-left .3s ease, opacity .25s ease" }}
      onMouseEnter={e => e.currentTarget.style.opacity=".85"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}>
      {/* One button can afford the words; a row of marks carries its own recognition.
          The words collapse rather than disappear, so the mark slides across to the
          middle instead of jumping there. The fade is deliberately much quicker than
          the collapse — held any longer, the text is still faintly on screen while
          the mark slides over it and reads as a rendering fault. */}
      <span style={{ maxWidth: compact ? 0 : 140, opacity: compact ? 0 : 1,
        overflow:"hidden", whiteSpace:"nowrap",
        transition:"max-width .3s ease, opacity .1s ease" }}>Buy now with</span>
      {/* No width transition any more — the mark is one size in both states, so only
          the label's collapse moves it. */}
      <span style={{ display:"flex", marginLeft: compact ? 0 : 8, flexShrink:0,
        transition:"margin-left .3s ease" }}>
        <WalletMark src={s.img} />
      </span>
    </button>
  );
}

/* Express buy — same visual weight as Add to cart, directly beneath it. The wallet
   sheet is the review step (line items, total, address, shipping method), so
   there's no interstitial confirm screen to slow it back down.

   Two treatments are built so they can be compared side by side from the demo
   banner, because "reduce clutter" and "show all options" pull against each other:

     single — one wallet (the device-preferred one, so Apple Pay on Apple hardware).
              "More payment options" reveals the rest in place, so every wallet is
              one tap away and no navigation is spent to reach it.
     row    — every available wallet in one compact row. Nothing hidden, but all
              three brand marks are always on screen.

   Once every wallet is on screen the link is gone: paying by card is what Add to
   cart directly above already leads to, and a second signpost to the same place
   only competes with it.
*/
const EXPRESS_STYLES = {
  single: "One button (expands)",
  row:    "All wallets",
};

function ExpressBuySection({ wallets, format, style = "single", onPress, note = true }) {
  const [expanded, setExpanded] = useState(false);
  if (!wallets.length) return null;

  const multi     = wallets.length > 1;
  const showAll   = style === "row" || expanded;
  const compact   = showAll && multi;
  const canReveal = style === "single" && multi;

  /* Spacing is on the children rather than a column `gap`, because a collapsed
     child would still be holding its gap and the row would shift by 8px the
     moment the reveal started. Both collapsing parts open on the same easing as
     the buttons, so the heading arrives as the marks settle. */
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      {multi && (
        <Collapse open={compact}>
          <span style={{ display:"block", paddingBottom:8, fontSize:13, fontWeight:600, color:T.textSubtle }}>
            Buy now with
          </span>
        </Collapse>
      )}
      <div style={{ display:"flex" }}>
        {/* Only the lead wallet is ever labelled, so the ones waiting to be revealed
            are compact from the start — otherwise they sit there with a full-width
            "Buy now with" collapsing behind their own mark on the way in. */}
        {wallets.map((w, i) => (
          <WalletButton key={w} wallet={w} first={i === 0} compact={compact || i > 0}
            hidden={i > 0 && !showAll} onPress={onPress} />
        ))}
      </div>
      {/* Reveals the other wallets in place, then retires — see the note above */}
      {canReveal && (
        <Collapse open={!expanded}>
          <div style={{ paddingTop:8, textAlign:"center" }}>
            {/* Collapse keeps its children mounted, so the retired link has to be
                taken out of the tab order by hand */}
            <button onClick={() => setExpanded(true)} tabIndex={expanded ? -1 : 0}
              style={{ background:"none", border:"none", padding:"2px 0", cursor:"pointer",
                color:T.textLink, fontSize:13, fontWeight:600, textDecoration:"underline" }}>
              More payment options
            </button>
          </div>
        </Collapse>
      )}
      {note && (
        <p style={{ marginTop:8, fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
          {hasPrint(format)
            ? "Skip the forms — your wallet fills in your address and shipping, and you confirm before paying."
            : "Skip the forms — nothing to ship, so it's pay and download. You confirm in your wallet before paying."}
        </p>
      )}
    </div>
  );
}

function ProductPage({ variant, format, setFormat, expressStyle, onAddToCart, onExpressBuy, onCartClick, cartCount, onCheckout }) {
  const wallets = useWallets();
  const { isDesktop } = useViewport();
  const [qty, setQty] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(true);   // "Book details" accordion
  const [detailsModal, setDetailsModal] = useState(false); // Print vs PDF comparison
  const [readMore, setReadMore] = useState(false);

  const bio = "Paige Hazelwood writes contemporary romance set in small towns where everyone knows your business — and nobody minds sharing it. A former landscape architect turned full-time author, she draws on a life among community gardens and negotiating tables for her stories of sharp wits and softer landings.";
  const detail = [
    ...(hasPrint(format) ? ["Hardcover, ImageWrap", "10x8 in, 25x20 cm"] : []),
    ...(hasDigital(format) ? [`PDF, ${PDF_FILE.size}`] : []),
    "20 pages", "Language: English", "Published October 2022", "ISBN 9798211886148",
  ];
  const chooseFormat = variant === "both";

  return (
    <div style={{ minHeight:"100vh", background:T.surface, display:"flex", flexDirection:"column" }}>
      <PdpNav cartCount={cartCount} onCartClick={onCartClick} />

      <div style={{ maxWidth:1280, margin:"0 auto", width:"100%", padding: isDesktop ? "40px 40px 0" : "24px 20px 0" }}>
        {/* Hero */}
        <div style={{ display:"flex", gap:40, alignItems:"flex-start", flexDirection: isDesktop ? "row" : "column" }}>
          {/* Cover */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, alignItems:"flex-start", width:"100%" }}>
            {/* Cover asset has no baked shadow — the preview component adds the drop shadow */}
            <img src={BOOK_COVER} alt={PRODUCT.title}
              style={{ width:"100%", maxWidth:535, height:"auto", display:"block", borderRadius:4, boxShadow:"0 12px 30px rgba(0,0,0,.22)" }} />
            <button style={{ background:"none", border:"none", cursor:"pointer", padding:0,
              display:"flex", alignItems:"center", gap:4, color:T.textLink }}>
              <span style={{ fontSize:16, fontWeight:600, textDecoration:"underline" }}>Share</span>
              <Ms name="share" size={24} color={T.textLink} />
            </button>
          </div>

          {/* Details */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:22, width:"100%" }}>
            <h1 style={{ fontFamily:FONT_HEADING, fontSize:44, fontWeight:400, lineHeight:1.2, color:T.textBold }}>{PRODUCT.title}</h1>
            <p style={{ fontFamily:FONT_HEADING, fontSize:20, fontWeight:500, lineHeight:1.2, color:T.textBold }}>by <span style={{ color:T.textSubtle }}>{PRODUCT.author}</span></p>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ fontSize:16, fontWeight:600, color:T.textBold }}>About the book</p>
              <p style={{ fontSize:16, color:T.textSubtle, lineHeight:1.5 }}>
                Can you fall for the right person when you've already decided everything about them is wrong?
                Elara Vance is a landscape architect who relies on sharp first impressions. When tech entrepreneur
                Julian Cross arrives to turn her town's historic community garden into a corporate campus, she
                instantly writes him off as arrogant, cold, and profit-driven.
                {readMore && (
                  <> {" "}Forced to negotiate, their meetings are a masterclass in sharp retorts. But as forced
                  proximity blurs the lines of their rivalry, they discover unexpected depth beneath each other's
                  armor. To find common ground, they must tear down the hardest walls of all: the preconceptions
                  they built around one another.</>
                )}
              </p>
              <button onClick={() => setReadMore(r => !r)}
                style={{ alignSelf:"flex-start", background:"none", border:"none", cursor:"pointer", padding:0,
                  color:T.textLink, fontWeight:600, fontSize:16, textDecoration:"underline" }}>
                {readMore ? "Read less" : "Read more"}
              </button>
            </div>

            {detailsModal && <FormatDetailsModal onClose={() => setDetailsModal(false)} />}

            {/* DS section order: selections, then Price, then Buttons — so the buyer
                chooses first and the price below reflects that choice. */}
            {chooseFormat && (
              <FormatChooser format={format} setFormat={setFormat} onDetails={() => setDetailsModal(true)} />
            )}

            <div style={{ borderTop:`1px solid ${T.borderSubtle}`, paddingTop:24 }}>
              <p style={{ fontFamily:FONT_HEADING, fontSize:32, fontWeight:500, lineHeight:1.2, color:T.textBold }}>{money(FORMATS[format].price)} USD</p>
              {/* Single-format link: state the format as product information, not as a
                  control. A one-option selector reads as broken, but the buyer still
                  has to know whether a printed book is coming — and with no selector
                  here, this is the only route to the format details. */}
              {!chooseFormat && (
                <p style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, fontSize:15, color:T.textSubtle, flexWrap:"wrap" }}>
                  <Ms name={hasPrint(format) ? "menu_book" : "picture_as_pdf"} size={20} color={T.brand} />
                  <span><strong style={{ color:T.textBold, fontWeight:600 }}>{FORMATS[format].label}</strong> · {FORMATS[format].blurb}</span>
                  <a href="#" onClick={e => { e.preventDefault(); setDetailsModal(true); }}
                    style={{ fontSize:15, fontWeight:600, color:T.textLink, textDecoration:"underline" }}>Details</a>
                </p>
              )}
              {format === "digital" && (
                <p style={{ fontSize:13, color:T.textSubtle, marginTop:6 }}>Digital download only — no printed book is shipped.</p>
              )}
            </div>

            {/* Quantity moves above the buttons so both can run full width and match
                each other. Design system Buttons pattern (Codex Foundation
                7850:31720): stacked, full width, 16px gap, no control inline. */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>Quantity</span>
              {/* Quantity applies to printed copies only — a PDF is one file per order. */}
              {hasPrint(format)
                ? <QuantityStepper qty={qty} setQty={setQty} />
                : <span style={{ alignSelf:"flex-start", display:"flex", alignItems:"center", gap:6, height:BTN_H,
                    padding:"0 12px", border:`1px solid ${T.border}`, borderRadius:T.radius, fontSize:14, color:T.textSubtle }}>
                    <Ms name="download" size={18} color={T.textSubtle} /> One file
                  </span>}
              {format === "both" && (
                <p style={{ fontSize:13, color:T.textSubtle }}>Applies to printed copies. The PDF is one file per order.</p>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <button onClick={() => onAddToCart(hasPrint(format) ? qty : 1)}
                style={{ width:"100%", height:BTN_H, background:T.brand, color:"#fff", border:"none",
                  borderRadius:T.radius, fontSize:16, fontWeight:600, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                onMouseEnter={e => e.currentTarget.style.opacity=".85"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                <Ms name="shopping_cart" size={20} color="#fff" /> Add to cart
              </button>
              {/* Sits in the same stack as Add to cart, same height, no "or" divider */}
              <ExpressBuySection wallets={wallets} format={format} style={expressStyle}
                onPress={w => onExpressBuy(hasPrint(format) ? qty : 1, w)} />
            </div>

            {/* Book details */}
            <div style={{ borderTop:`1px solid ${T.border}` }}>
              <button onClick={() => setDetailsOpen(o => !o)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                  background:"none", border:"none", cursor:"pointer", padding:"12px 0" }}>
                <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>Book details</span>
                <Ms name={detailsOpen ? "expand_less" : "expand_more"} />
              </button>
              <Collapse open={detailsOpen}>
                <ul style={{ paddingLeft:20, paddingBottom:8, color:T.textBold, fontSize:14, lineHeight:1.7 }}>
                  {detail.map(d => <li key={d}>{d}</li>)}
                </ul>
              </Collapse>
            </div>
          </div>
        </div>

        <BookPreview />

        {/* Author profile */}
        <div style={{ marginTop:56, display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>
          <img src={AUTHOR_PHOTO} alt={PRODUCT.author}
            style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
          <div style={{ flex:1, minWidth:280 }}>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:500, color:T.textBold }}>About the author</h3>
            <p style={{ fontSize:15, color:T.textSubtle, lineHeight:1.6, marginTop:8, maxWidth:640 }}>{bio}</p>
            <div style={{ display:"flex", gap:18, marginTop:12, flexWrap:"wrap" }}>
              {[["language","www.d-toi.website.com"],["thumb_up","Facebook"],["photo_camera","Instagram"],["close","X"],["music_note","TikTok"]].map(([ic,label]) => (
                <span key={label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:14, color:T.textLink }}>
                  <Ms name={ic} size={18} color={T.textLink} /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* More from author (Figma 4401:3324) */}
        <div style={{ marginTop:56, paddingBottom:56, display:"flex", flexDirection:"column", gap:48 }}>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize: isDesktop ? 44 : 32, fontWeight:500, lineHeight:1.2, color:T.textBold }}>More from {PRODUCT.author}</h2>
          <div style={{ display:"flex", flexWrap:"wrap", gap:24 }}>
            {[["Sense and Sentimentality","Two sisters. Two very different ideas of love. One summer that changes everything.","$28.00",BOOK_SENSE],
              ["The Gardner's Dilemma","When the land you've tended for decades is suddenly worth more than you ever imagined, what do you sacrifice to keep it?","$24.00",BOOK_GARDNERS]].map(([t,d,p,img]) => (
              <div key={t} style={{ width:340, maxWidth:"100%", display:"flex", flexDirection:"column", gap:16 }}>
                {/* Square frame (Figma 410.667²); absolutely-positioned img so aspect-ratio
                    controls the height and the portrait cover is contained (gaps on the sides) */}
                <div style={{ position:"relative", width:"100%", aspectRatio:"1 / 1", borderRadius:8, overflow:"hidden" }}>
                  <img src={img} alt={t} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"0 12px" }}>
                  <p style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:500, lineHeight:1.2, color:T.textBold }}>{t}</p>
                  <p style={{ fontSize:16, color:T.textSubtle, lineHeight:1.4 }}>{d}</p>
                  <p style={{ fontSize:16, fontWeight:700, color:T.textSubtle, lineHeight:1.4 }}>Starting at {p}</p>
                  <button style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 24px 8px 0",
                    display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16, fontWeight:600, color:T.brand, lineHeight:"24px",
                      borderBottom:`1px solid ${T.brand}`, paddingBottom:2 }}>View book</span>
                    <Ms name="arrow_forward" size={24} color={T.brand} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PdpFooter />
    </div>
  );
}

/* ═══════════════════════════ CART SLIDE-OVER ═══════════════════════════ */
function CartDrawer({ open, empty, qty, setQty, variant, format, setFormat, expressStyle, onClose, onRemove, onCheckout, onExpressBuy }) {
  const wallets = useWallets();
  const items = lineItems(format, qty);
  const saving = savingOf(format);
  const subtotal = subtotalOf(format, qty) - saving;
  /* On a both-format link the cart is the natural upsell spot: an explicit,
     unticked offer to add the other format — never pre-selected. */
  const canAddPdf   = variant === "both" && format === "print";
  const canAddPrint = variant === "both" && format === "digital";
  /* Removing one half of a bundle leaves the other half in the cart; removing the
     only line empties it. */
  const removeItem = item => (format === "both"
    ? () => setFormat(item.id === "print" ? "digital" : "print")
    : onRemove);

  return (
    <>
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:120,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition:"opacity .25s" }} />
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:428, maxWidth:"92vw", background:T.surface, zIndex:130,
        transform: open ? "translateX(0)" : "translateX(100%)", transition:"transform .3s ease",
        display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid #eee" }}>
          <span style={{ fontSize:20, fontWeight:700, color:T.textBold }}>Your cart</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }} aria-label="Close cart"><Ms name="close" size={22} /></button>
        </div>

        {empty ? (
          /* ── Empty state (Figma 11642:167062) ── */
          <div style={{ flex:1, overflowY:"auto", padding:"40px 24px", display:"flex", flexDirection:"column", gap:16, alignItems:"center" }}>
            <Ms name="shopping_cart" size={48} color={T.brand} />
            <p style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:500, lineHeight:1.2, color:T.textBold, textAlign:"center" }}>Your cart is empty</p>
            <p style={{ fontSize:16, color:T.textSubtle, lineHeight:1.4, textAlign:"center" }}>Browse our collection to find something you love.</p>
            <Btn onClick={onClose} fullWidth>Browse your projects</Btn>
          </div>
        ) : (
          <>
            {/* Body — one block per product, grouped by how it's fulfilled, so it's
                obvious why shipping applies to only part of a mixed order. */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {/* Group heading only when there's more than one fulfilment type to tell apart */}
                  {items.length > 1 && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:".04em", color:T.textSubtle }}>
                      <Ms name={item.fulfil === "ship" ? "local_shipping" : "download"} size={16} color={T.textSubtle} />
                      {FULFIL_LABEL[item.fulfil]}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:14 }}>
                    <div style={{ position:"relative", flexShrink:0, width:100 }}>
                      <img src={BOOK_COVER} alt="" style={{ width:100, height:"auto", borderRadius:4, display:"block",
                        opacity: item.fulfil === "download" ? .9 : 1 }} />
                      {item.fulfil === "download" && (
                        <span style={{ position:"absolute", bottom:6, left:6, background:"rgba(0,0,0,.72)", color:"#fff",
                          borderRadius:3, padding:"2px 6px", fontSize:10, fontWeight:700, letterSpacing:".04em" }}>PDF</span>
                      )}
                    </div>
                    <div style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
                      <div><strong style={{ color:T.textBold }}>Title:</strong> {PRODUCT.title}</div>
                      <div>by {PRODUCT.author}</div>
                      <div><strong style={{ color:T.textBold }}>Format:</strong> {item.kind}</div>
                      {item.fulfil === "ship"
                        ? <><div><strong style={{ color:T.textBold }}>Project options:</strong> {PRODUCT.options}</div>
                            <div><strong style={{ color:T.textBold }}># of pages:</strong> 20</div>
                            <div style={{ color:T.textBold, fontWeight:700, marginTop:4 }}>{PRODUCT.format}</div>
                            <div>{PRODUCT.paper}</div></>
                        : <><div><strong style={{ color:T.textBold }}># of pages:</strong> 20</div>
                            <div>{PDF_FILE.size} · {PDF_FILE.name}</div></>}
                    </div>
                  </div>
                  {/* Print carries a quantity; a PDF is one file per order, so it gets a
                      fixed label instead of a stepper. */}
                  {item.fulfil === "ship" ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <span style={{ fontSize:15, fontWeight:600, color:T.textBold }}>Quantity</span>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <QuantityStepper qty={qty} setQty={setQty} onBelowMin={onRemove} />
                        <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>{money(item.total)} USD</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:14, color:T.textSubtle }}>Quantity 1 — one file per order</span>
                      <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>{money(item.total)} USD</span>
                    </div>
                  )}
                  <button onClick={removeItem(item)}
                    style={{ alignSelf:"flex-start", background:"none", border:"none", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:8, padding:"4px 24px 4px 0" }}>
                    <Ms name="delete" size={22} color={T.textBold} />
                    <span style={{ fontSize:15, fontWeight:600, color:T.textBold, lineHeight:"24px",
                      borderBottom:`1px solid ${T.textBold}`, paddingBottom:2 }}>Remove</span>
                  </button>
                </div>
              ))}

              {/* Explicit, unticked upsell — the other format is offered, never added for
                  you. Styled on the DS selector tile (white, 4px radius, 12/16 padding)
                  but outlined in #0d2f44 rather than the #989898 default, so the offer
                  carries more weight than a resting option without being a filled
                  button. */}
              {(canAddPdf || canAddPrint) && (
                <div style={{ background:T.surface, border:`1px solid ${T.borderActive}`, borderRadius:T.radius,
                  padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Ms name={canAddPdf ? "picture_as_pdf" : "menu_book"} size={20} color={T.textBold} />
                    <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>
                      {canAddPdf
                        ? `Add the PDF for ${money(FORMATS.digital.price)}`
                        : `Add the printed book for ${money(FORMATS.print.price)}`}
                    </span>
                  </div>
                  <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.4 }}>
                    {canAddPdf
                      ? `Read it straight away while you wait for the printed copy. Bundled with your book you save ${money(BUNDLE_SAVING)}.`
                      : `A hardcover copy for the shelf, shipped to you. Bundled with your PDF you save ${money(BUNDLE_SAVING)}.`}
                  </p>
                  <Btn variant="secondary" onClick={() => setFormat("both")}>{canAddPdf ? "Add PDF" : "Add printed book"}</Btn>
                </div>
              )}
            </div>

            {/* Footer summary */}
            <div style={{ borderTop:"1px solid #eee", padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
              <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Order summary</span>
              {saving > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px" }}>
                  <span style={{ color:T.textBold }}>Bundle saving</span>
                  <span style={{ color:T.success }}>-{money(saving)}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>
                <span>Subtotal</span><span>{money(subtotal)} USD</span>
              </div>
              <p style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
                {hasPrint(format)
                  ? <>Tax and <a href="#" style={{ color:T.textLink }}>Shipping</a> are calculated at Checkout. </>
                  : <>Tax is calculated at Checkout from your billing location. There's nothing to ship — your download is ready as soon as you pay. </>}
                You may also enter a promotional code at checkout. Please note that volume discounts cannot be combined with promotional codes.
              </p>
              <Btn onClick={onCheckout} fullWidth>Checkout</Btn>
              {/* Wallets sit right by the Checkout button so an impulse buy never has
                  to enter the checkout at all. No card link here — the Checkout
                  button above already is that route. */}
              <ExpressBuySection wallets={wallets} format={format} note={false}
                style={expressStyle} onPress={w => onExpressBuy(qty, w)} />
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
                color:T.textLink, fontWeight:600, fontSize:14, textDecoration:"underline" }}>Continue shopping</button>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, color:T.textSubtle }}>
                <Ms name="lock" size={14} color={T.textSubtle} /> Secure &amp; encrypted checkout by Blurb, Inc.
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* Discount row + promo entry, shared across all checkout flows (Figma
   10978:34590). Label reads "Volume discount" when a volume discount is
   auto-applied, otherwise "Promo code". Handles error add/clear and removal. */
function DiscountSection({ volumeDiscount = 0, appliedCode, onApply, orderPlaced }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const codeValue = appliedCode ? PROMO_CODES[appliedCode] : 0;
  const savesLess = appliedCode && volumeDiscount > 0 && codeValue < volumeDiscount;
  const note = (bg, color) => ({ display:"flex", alignItems:"flex-start", gap:6, background:bg, color,
    borderRadius:T.radius, padding:"8px 10px", fontSize:13, lineHeight:1.4 });

  const apply = () => {
    const code = input.trim().toUpperCase();
    if (!code)                return setError("Enter a promo code.");
    if (!PROMO_CODES[code])   return setError("This code isn't valid or has expired.");
    setError(""); setInput(""); onApply(code);
  };

  if (appliedCode) return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:16, fontWeight:600, lineHeight:"24px" }}>
        <span style={{ display:"flex", alignItems:"center", gap:6, color:T.success }}>
          {appliedCode} – Code applied
          {!orderPlaced && (
            <button onClick={() => { setError(""); onApply(null); }} aria-label="Remove code"
              style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:0 }}>
              <Ms name="close" size={16} color={T.textSubtle} />
            </button>
          )}
        </span>
        <span style={{ color:T.success }}>-{money(codeValue)}</span>
      </div>
      {!orderPlaced && (savesLess
        ? <div style={note(T.panel, "#0a5a80")}><Ms name="info" size={16} color={T.brand} /> This code saves less than your volume discount.</div>
        : <div style={note(T.successBg, T.success)}><Ms name="check_circle" size={16} color={T.success} /> Code applied successfully.</div>)}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {volumeDiscount > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px" }}>
          <span style={{ color:T.textBold }}>Volume discount</span>
          <span style={{ color:T.success }}>-{money(volumeDiscount)}</span>
        </div>
      )}
      {!orderPlaced && (
        <>
          {volumeDiscount === 0 && <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>Promo code</span>}
          <div style={{ display:"flex", gap:8 }}>
            <input value={input} onChange={e => { setInput(e.target.value); if (error) setError(""); }}
              onKeyDown={e => e.key === "Enter" && apply()} placeholder="Enter code"
              style={{ flex:1, border:`1px solid ${error ? T.textError : T.border}`, borderRadius:T.radius, padding:"8px 11px", fontSize:14 }} />
            <Btn variant="secondary" onClick={apply}>Apply</Btn>
          </div>
          {error && <div style={note(T.errorBg, T.textError)}><Ms name="info" size={16} color={T.textError} /> {error}</div>}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════ ORDER SUMMARY (checkout / read-only) ═══════════════════════════ */
function OrderSummary({ format="print", qty=1, volumeDiscount=0, appliedCode, onApplyCode, shippingCost, taxReady, paymentDone, onPlaceOrder, orderPlaced }) {
  const [productsOpen, setProductsOpen] = useState(true);
  const items    = lineItems(format, qty);
  const subtotal = subtotalOf(format, qty);
  const saving   = savingOf(format);
  const disc     = appliedCode ? PROMO_CODES[appliedCode] : volumeDiscount;
  /* Physical goods are taxed on the ship-to address, digital goods on the buyer's
     billing location — one line here, two calculations behind it in production. */
  const tax    = taxReady ? Math.round((subtotal - saving) * 0.08 * 100) / 100 : null;
  const total  = subtotal - saving - disc + (shippingCost || 0) + (tax || 0);
  const ships  = hasPrint(format);

  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Order summary</span>
        <span style={{ fontSize:14, color:T.textBold }}>Prices in USD</span>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>
        <span>Subtotal</span><span>{money(subtotal)}</span>
      </div>

      {saving > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px" }}>
          <span style={{ color:T.textBold }}>Bundle saving</span>
          <span style={{ color:T.success }}>-{money(saving)}</span>
        </div>
      )}

      <DiscountSection volumeDiscount={volumeDiscount} appliedCode={appliedCode} onApply={onApplyCode} orderPlaced={orderPlaced} />

      {/* No shipping row at all on a digital-only order — a $0.00 line still reads
          as "something is being shipped". */}
      {ships && (
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>
          <span style={{ display:"flex", alignItems:"center", gap:2 }}>Shipping <Ms name="info" size={16} color={T.textSubtle} /></span>
          <span>{shippingCost ? money(shippingCost) : <span style={{ color:T.textSubtle, fontWeight:400 }}>Select shipping method</span>}</span>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>
        <span style={{ display:"flex", alignItems:"center", gap:2 }}>Tax <Ms name="info" size={16} color={T.textSubtle} /></span>
        <span>{tax != null ? money(tax) : <span style={{ color:T.textSubtle, fontWeight:400 }}>{ships ? "Enter shipping address" : "Enter billing address"}</span>}</span>
      </div>

      <Divider />
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:18, fontWeight:600, lineHeight:"28px", color:T.textBold }}>Total</span>
        <span style={{ fontSize:18, fontWeight:600, lineHeight:"28px", color:T.textBold }}>{money(total)}</span>
      </div>

      {!orderPlaced && onPlaceOrder && (
        <>
          <p style={{ fontSize:11, color:T.textSubtle, lineHeight:1.6 }}>
            By clicking the "Place order" button you confirm your agreement with{" "}
            <a href="#" style={{ color:T.textLink }}>Blurb's Terms</a>, <a href="#" style={{ color:T.textLink }}>Conditions</a>,
            and <a href="#" style={{ color:T.textLink }}>Return policy</a>.{" "}
            {ships && "You can change or cancel a printed order within three hours of placing it. "}
            PDFs are non-refundable and can't be canceled.
          </p>
          <Btn onClick={paymentDone ? onPlaceOrder : undefined} disabled={!paymentDone} fullWidth>Place order</Btn>
        </>
      )}

      <Divider />
      <button onClick={() => setProductsOpen(o => !o)}
        style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", padding:"4px 0" }}>
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Products</span>
        <Ms name={productsOpen ? "expand_less" : "expand_more"} />
      </button>
      <Collapse open={productsOpen}>
        {/* Grouped by fulfilment so a mixed order shows plainly which part ships */}
        <div style={{ display:"flex", flexDirection:"column", gap:16, paddingTop:8 }}>
          {items.map(item => (
            <div key={item.id} style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {items.length > 1 && (
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:".04em", color:T.textSubtle }}>
                  <Ms name={item.fulfil === "ship" ? "local_shipping" : "download"} size={14} color={T.textSubtle} />
                  {FULFIL_LABEL[item.fulfil]}
                </div>
              )}
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ position:"relative", flexShrink:0, width:76 }}>
                  <img src={BOOK_COVER} alt="" style={{ width:76, height:"auto", borderRadius:4, display:"block" }} />
                  <span style={{ position:"absolute", top:-6, right:-6, background:T.surfaceSunken, borderRadius:12, padding:"2px 7px", fontSize:11, fontWeight:600, color:T.textBold }}>{item.qty}</span>
                  {item.fulfil === "download" && (
                    <span style={{ position:"absolute", bottom:4, left:4, background:"rgba(0,0,0,.72)", color:"#fff",
                      borderRadius:3, padding:"1px 5px", fontSize:9, fontWeight:700, letterSpacing:".04em" }}>PDF</span>
                  )}
                </div>
                <div style={{ fontSize:13, color:T.textBold, lineHeight:1.65 }}>
                  <div style={{ fontWeight:700 }}>{PRODUCT.title}</div>
                  <div style={{ color:T.textSubtle }}>{item.kind}</div>
                  {item.lines.map(l => <div key={l} style={{ color:T.textSubtle }}>{l}</div>)}
                  <div style={{ fontWeight:700 }}>{money(item.unit)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  );
}

/* ═══════════════════════════ CHECKOUT SECTIONS ═══════════════════════════ */
function ExpressCheckout({ open, onToggle, onExpressSelect, digitalOnly }) {
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow }}>
      <button onClick={onToggle}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", background:"none", border:"none", cursor:"pointer" }}>
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Express checkout</span>
        <Ms name={open ? "expand_less" : "expand_more"} />
      </button>
      <Collapse open={open}>
        {/* The wallet sheet must be told not to request a shipping address for a
            digital-only order, or it asks for one the order has no use for. */}
        {digitalOnly && (
          <p style={{ padding:"0 24px 12px", fontSize:13, color:T.textSubtle, display:"flex", alignItems:"center", gap:6 }}>
            <Ms name="info" size={16} color={T.brand} /> No shipping requested — the wallet only needs a billing country for tax.
          </p>
        )}
        {/* Reads off WALLET_STYLE rather than its own list — this row had a third
            treatment again (white grounds, light-ground marks, per-wallet widths
            of 73/90/63 that squashed whichever mark didn't match). BTN_H matches
            the Codex Button; BTN_H less WALLET_CLEAR top and bottom is what's
            left for the mark. */}
        <div style={{ padding:"0 24px 24px", display:"flex", gap:10 }}>
          {["Apple Pay", "PayPal", "Google Pay"].map(id => (
            <button key={id} onClick={() => onExpressSelect(id)} aria-label={`Pay with ${id}`}
              style={{ flex:1, minWidth:0, height:BTN_H, padding:`0 ${WALLET_CLEAR}px`,
                border:"none", borderRadius:T.radius, background:WALLET_STYLE[id].bg,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity=".85"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <WalletMark src={WALLET_STYLE[id].img} height={BTN_H - WALLET_CLEAR * 2} />
            </button>
          ))}
        </div>
      </Collapse>
    </div>
  );
}

function GuestSignIn({ open, onToggle, completed, email, onContinue }) {
  const [tab, setTab] = useState("guest");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState({});
  const valid = v => v && v.includes("@") && v.includes(".");
  const DEMO = DEMO_BUYER_EMAIL;
  const fillGuest = () => { if (!em) { setEm(DEMO); setErrors({}); } };
  const fillSignin = () => { if (!em || !pw) { setEm(DEMO); setPw("Demo1234"); setErrors({}); } };

  const guest = () => { if (!valid(em)) return setErrors({ email:"Enter a valid email address" }); onContinue(em); };
  const signin = () => {
    const e = {};
    if (!valid(em)) e.email = "Enter a valid email address";
    if (!pw) e.password = "Enter your password";
    if (Object.keys(e).length) return setErrors(e);
    onContinue(em);
  };
  const social = () => onContinue(DEMO_BUYER_EMAIL);

  const tabStyle = key => ({ background:"none", border:"none", borderBottom: tab===key ? `3px solid ${T.brand}` : "3px solid transparent",
    padding:"10px 0", cursor:"pointer", fontSize:15, fontWeight: tab===key ? 700 : 400, color:T.textBold, marginBottom:-1 });

  return (
    <AccordionSection title="Sign in or continue as a guest" open={open} onToggle={onToggle} completed={completed} summary={email}>
      <AutoHeight>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", gap:24, borderBottom:`1px solid ${T.border}` }}>
            <button style={tabStyle("signin")} onClick={() => { setTab("signin"); setErrors({}); }}>Sign in</button>
            <button style={tabStyle("guest")} onClick={() => { setTab("guest"); setErrors({}); }}>Guest checkout</button>
          </div>
          {tab === "guest" ? (
            <>
              <Input label="Email address" required type="email" placeholder="name@example.com"
                hint="Your order confirmation will be sent here." error={errors.email} value={em}
                onChange={v => { setEm(v); setErrors({}); }} onClick={fillGuest} />
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold }}>
                <input type="checkbox" checked={marketing} onChange={() => setMarketing(m => !m)} style={{ accentColor:T.brand, width:16, height:16, flexShrink:0 }} />
                Yes, I'd like updates and offers from this author.
              </label>
              <div><Btn onClick={guest} disabled={!valid(em)}>Continue as guest</Btn></div>
            </>
          ) : (
            <>
              <Input label="Email address" required type="email" placeholder="name@example.com"
                error={errors.email} value={em} onChange={v => { setEm(v); setErrors({}); }} onClick={fillSignin} />
              <Input label="Password" required type={showPw ? "text" : "password"}
                error={errors.password} value={pw} onChange={v => { setPw(v); setErrors({}); }} onClick={fillSignin}
                rightIcon={<button onClick={() => setShowPw(s => !s)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex" }}><Ms name={showPw ? "visibility" : "visibility_off"} size={20} color={T.textSubtle} /></button>} />
              <div><Btn onClick={signin}>Sign in</Btn></div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, height:1, background:T.border }} />
                <span style={{ fontSize:13, color:T.textSubtle }}>or continue with</span>
                <div style={{ flex:1, height:1, background:T.border }} />
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {[["google","Google",<GoogleGlyph key="g" />],["apple","Apple",<AppleGlyph key="a" />],["facebook","Facebook",<FacebookGlyph key="f" />]].map(([id,label,icon]) => (
                  <button key={id} onClick={() => social()}
                    style={{ flex:1, height:48, border:`1px solid ${T.border}`, borderRadius:T.radius, background:T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:14, fontWeight:600, color:T.textBold }}
                    onMouseEnter={e => e.currentTarget.style.borderColor=T.brand}
                    onMouseLeave={e => e.currentTarget.style.borderColor=T.border}>
                    {icon}<span>{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </AutoHeight>
    </AccordionSection>
  );
}

function AddressForm({ form, setForm, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const cfg = COUNTRY_FIELDS[form.country] || DEFAULT_COUNTRY_FIELDS;
  const fillName = () => { if (!form.firstName && !form.lastName) setForm(f => ({ ...f, firstName:"Alex", lastName:"Reader", company:"", phone:"+1 415-555-0175" })); };
  const fillRest = () => { if (!form.address) setForm(f => ({ ...f, ...cfg.demo })); };
  const cb = { display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Input label="First name" required error={errors.firstName} value={form.firstName} onChange={v => set("firstName",v)} onClick={fillName} />
        <Input label="Last name" required error={errors.lastName} value={form.lastName} onChange={v => set("lastName",v)} onClick={fillName} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Input label="Company" value={form.company} onChange={v => set("company",v)} onClick={fillName} />
        <Input label="Phone number" required placeholder="123-456-7890" error={errors.phone} value={form.phone} onChange={v => set("phone",v)} type="tel" onClick={fillName} />
      </div>
      <Combobox label="Country" required options={COUNTRIES} value={form.country}
        onChange={v => setForm(f => ({ ...f, country:v, state:"" }))} error={errors.country} />
      <Collapse open={!!form.country}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Input label="Address" required placeholder="123 Main Street" error={errors.address} value={form.address} onChange={v => set("address",v)} onClick={fillRest} />
          <Input label="Address line 2" placeholder="Apt, suite, unit, etc." value={form.address2} onChange={v => set("address2",v)} />
          <Input label="City" required error={errors.city} value={form.city} onChange={v => set("city",v)} onClick={fillRest} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {cfg.stateOptions
              ? <SelectInput label={cfg.stateLabel} required={cfg.stateRequired} options={cfg.stateOptions} value={form.state} onChange={v => set("state",v)} />
              : <Input label={cfg.stateLabel} required={cfg.stateRequired} error={errors.state} value={form.state} onChange={v => set("state",v)} onClick={fillRest} />}
            <Input label={cfg.zipLabel} required error={errors.zip} value={form.zip} onChange={v => set("zip",v)} onClick={fillRest} />
          </div>
        </div>
      </Collapse>
    </div>
  );
}

/* Decision A (copy audit, 2026-08-03): an empty required field says what to do and
   names itself. Postcode wording follows the country's own label rather than a
   US-centric "zip". Mirrored field-by-field in App.jsx — keep the two in step. */
const REQUIRED_MSG = {
  firstName: () => "Enter your first name",
  lastName:  () => "Enter your last name",
  phone:     () => "Enter your phone number",
  country:   () => "Select a country",
  address:   () => "Enter your address",
  city:      () => "Enter your city",
  zip:       cfg => `Enter your ${cfg.zipLabel.toLowerCase()}`,
};
const requiredMsg = (k, cfg) => REQUIRED_MSG[k](cfg);

function ShippingAddress({ open, onToggle, savedAddress, onComplete, onModify }) {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [errors, setErrors] = useState({});
  const cfg = COUNTRY_FIELDS[form.country] || DEFAULT_COUNTRY_FIELDS;
  const canContinue = form.firstName && form.lastName && form.phone && form.country && form.address && form.city && form.zip && (!cfg.stateRequired || form.state);
  const submit = () => {
    const e = {};
    ["firstName","lastName","phone","country","address","city","zip"].forEach(k => { if (!form[k]) e[k] = requiredMsg(k, cfg); });
    if (cfg.stateRequired && !form.state) e.state = `Select a ${cfg.stateLabel.toLowerCase()}`;
    if (Object.keys(e).length) return setErrors(e);
    onComplete(form);
  };
  return (
    <AccordionSection title="Shipping address" open={open}
      onToggle={savedAddress && !open ? onModify : onToggle} completed={!!savedAddress}
      summary={savedAddress ? `${savedAddress.firstName} ${savedAddress.lastName} · ${[savedAddress.address, savedAddress.city, savedAddress.country].filter(Boolean).join(", ")}` : null}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <AddressForm form={form} setForm={setForm} errors={errors} />
        <div style={{ marginTop:4 }}><Btn onClick={submit} disabled={!canContinue}>Continue</Btn></div>
      </div>
    </AccordionSection>
  );
}

function ShippingOptions({ open, onToggle, disabled, savedMethod, onConfirm }) {
  const [selected, setSelected] = useState(savedMethod || null);
  const savedOpt = SHIPPING_OPTS.find(o => o.id === savedMethod);
  const selOpt = SHIPPING_OPTS.find(o => o.id === selected);
  return (
    <AccordionSection title="Shipping method" open={open} onToggle={onToggle} disabled={disabled}
      completed={!!savedMethod} summary={savedOpt ? `${savedOpt.label} · ${money(savedOpt.price)} · ${savedOpt.desc}` : null}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {SHIPPING_OPTS.map(o => (
          <label key={o.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
            border:`1px solid ${selected===o.id ? T.brand : T.border}`, borderRadius:T.radius, cursor:"pointer",
            background: selected===o.id ? T.panel : T.surface }}>
            <input type="radio" name="ship" checked={selected===o.id} onChange={() => setSelected(o.id)} style={{ accentColor:T.brand }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:15, color:T.textBold }}>{o.label}</div>
              <div style={{ fontSize:13, color:T.textSubtle }}>{o.desc}</div>
            </div>
            <span style={{ fontWeight:600, color:T.textBold }}>{money(o.price)}</span>
          </label>
        ))}
        {selected && <div style={{ marginTop:4 }}><Btn onClick={() => onConfirm(selected, selOpt.price)}>Continue</Btn></div>}
      </div>
    </AccordionSection>
  );
}

function CardBrandIcon({ src, blue }) {
  return (
    <span style={{ width:40, height:30, border:"1px solid #dcdcdc", borderRadius:6, background: blue ? "#1f72cd" : "#fff",
      flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:"5px 6px" }}>
      <img src={src} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", display:"block" }} />
    </span>
  );
}
function PayMark({ id }) {
  if (id === "card") return (
    <span style={{ display:"flex", gap:8, flexShrink:0 }}>
      <CardBrandIcon src={VISA} /><CardBrandIcon src={MASTERCARD} /><CardBrandIcon src={AMEX} blue /><CardBrandIcon src={DISCOVER} />
    </span>
  );
  const src = { apple:APPLE_PAY, gpay:GPAY, paypal:PAYPAL_IMG }[id];
  return <img src={src} alt="" style={{ height:24, width:"auto", objectFit:"contain", display:"block", flexShrink:0 }} />;
}

function Payment({ open, onToggle, disabled, completed, onComplete, requireBilling, billing:billingProp, setBilling:setBillingProp }) {
  const [method, setMethod] = useState(null);    // radio selection
  const [applied, setApplied] = useState(null);  // selection committed via Continue
  const [confirmedMethod, setConfirmedMethod] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [billingDiff, setBillingDiff] = useState(false);
  const [localBilling, setLocalBilling] = useState(EMPTY_ADDRESS);
  /* On a digital-only order the billing address is the order's only location, so
     it lives in order state and drives the tax line live as it's typed. */
  const billing    = requireBilling ? billingProp : localBilling;
  const setBilling = requireBilling ? setBillingProp : setLocalBilling;
  const [billErrors, setBillErrors] = useState({});
  const [card, setCard] = useState({ number:"", name:"", expiry:"", cvv:"" });
  const [showCvv, setShowCvv] = useState(false);
  const [errors, setErrors] = useState({});
  const setC = (k, v) => setCard(c => ({ ...c, [k]:v }));
  const fillCard = () => { if (!card.number && !card.name) { setCard({ number:"4242 4242 4242 4242", name:"Alex Reader", expiry:"12/2027", cvv:"321" }); setMethod("card"); setErrors({}); } };

  const OPTS = [{ id:"card", label:"Credit or debit card" }, { id:"apple", label:"Apple Pay" }, { id:"gpay", label:"Google Pay" }, { id:"paypal", label:"PayPal" }];
  const LABELS = { card:"Credit or debit card", apple:"Apple Pay", gpay:"Google Pay", paypal:"PayPal" };
  const INFO = {
    apple:"You'll be prompted to authorize with Apple Pay after reviewing your order.",
    gpay:"You'll be prompted to authorize with Google Pay after reviewing your order.",
    paypal:"You'll be redirected to PayPal to complete your payment.",
  };

  const confirm = () => {
    if (method === "card") {
      const e = {};
      if (!card.number) e.number = "Enter your card number";
      else if (card.number.replace(/\s/g,"").length < 13) e.number = "Enter a valid card number";
      if (!card.name) e.name = "Enter the name on your card";
      if (!card.expiry) e.expiry = "Enter the expiry date";
      if (!card.cvv) e.cvv = "Enter the security code";
      else if (card.cvv.length < 3) e.cvv = "Security code must be at least 3 digits";
      if (Object.keys(e).length) return setErrors(e);
      /* No shipping address to fall back on, so the billing address is mandatory here */
      if (requireBilling) {
        const b = {};
        ["firstName","lastName","phone","country","address","city","zip"].forEach(k => { if (!billing[k]) b[k] = requiredMsg(k, COUNTRY_FIELDS[billing.country] || DEFAULT_COUNTRY_FIELDS); });
        if (Object.keys(b).length) return setBillErrors(b);
      }
    } else if (requireBilling && !billing.country) {
      /* Wallets return a billing country and postal code with the authorization —
         that's what supplies the tax location when there's no address step. */
      setBilling({ ...EMPTY_ADDRESS, firstName:"Alex", lastName:"Reader", country:"United States", city:"San Francisco", state:"CA", zip:"94104" });
    }
    setConfirmedMethod(method); setPaySuccess(true);
    setTimeout(() => { setPaySuccess(false); onComplete(method); }, 1000);
  };
  /* Back to step 1 — re-shows the full list with the current pick still selected */
  const chooseAnother = (
    <button onClick={() => { setApplied(null); setErrors({}); }}
      style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0, cursor:"pointer", color:T.textLink, fontSize:14, fontWeight:600, textDecoration:"underline" }}>
      Choose another way to pay
    </button>
  );

  /* Card fields + billing address — rendered under the card radio row once applied */
  const cardForm = (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <Ms name="lock" size={16} color={T.textSubtle} />
        <span style={{ fontSize:13, color:T.textSubtle }}>Your payment will be securely encrypted</span>
      </div>
      <Input label="Card number" required error={errors.number} value={card.number} onChange={v => setC("number",v)} onClick={fillCard} />
      <Input label="Name on card" required error={errors.name} value={card.name} onChange={v => setC("name",v)} onClick={fillCard} />
      <Input label="Expiration date (MM/YYYY)" required error={errors.expiry} value={card.expiry} onChange={v => setC("expiry",v)} onClick={fillCard} />
      <Input label="Security code (CVV)" required error={errors.cvv} value={card.cvv} onChange={v => setC("cvv",v)} onClick={fillCard}
        rightIcon={<button onClick={() => setShowCvv(s => !s)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex" }}><Ms name={showCvv ? "visibility" : "visibility_off"} size={16} color={T.textSubtle} /></button>} />
      <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginTop:4 }}>Billing address</p>
      {/* With a shipping address on file the billing address can default to it. On a
          digital-only order there isn't one, so it's always asked for — and it's what
          the tax on a digital purchase is calculated from. */}
      {requireBilling ? (
        <>
          <p style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
            Your country and postal code determine the tax on a digital purchase.
          </p>
          <AddressForm form={billing} setForm={setBilling} errors={billErrors} />
        </>
      ) : (
        <>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
            <input type="checkbox" checked={!billingDiff} onChange={() => setBillingDiff(b => !b)} style={{ accentColor:T.brand }} />
            Same as shipping address
          </label>
          <Collapse open={billingDiff}>
            <div style={{ paddingTop:4 }}>
              <AddressForm form={billing} setForm={setBilling} errors={billErrors} />
            </div>
          </Collapse>
        </>
      )}
    </div>
  );

  return (
    <AccordionSection title="Payment" open={open} onToggle={onToggle} disabled={disabled}
      completed={completed} summary={LABELS[confirmedMethod] || "Payment method confirmed"}>
      <AutoHeight>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Step 1: pick from the full list. Step 2 (after Continue): only the applied
              method stays, expanded, and Continue submits it. */}
          {OPTS.filter(o => !applied || o.id === applied).map(o => (
            <React.Fragment key={o.id}>
              <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                padding:"12px 14px", borderRadius:T.radius, cursor:"pointer",
                border:`1px solid ${method===o.id ? T.brand : T.border}`, background: method===o.id ? T.panel : T.surface }}>
                <span style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                  <input type="radio" name="pay" checked={method===o.id} onChange={() => { setMethod(o.id); setErrors({}); }} style={{ accentColor:T.brand, flexShrink:0 }} />
                  <span style={{ fontSize:15, color:T.textBold }}>{o.label}</span>
                </span>
                <PayMark id={o.id} />
              </label>
              {applied === o.id && o.id === "card" && cardForm}
              {applied === o.id && o.id !== "card" && !paySuccess && INFO[o.id] && (
                <Alert type="info" message={requireBilling
                  ? `${INFO[o.id]} It won't ask for a shipping address — only a billing country and postal code, for tax.`
                  : INFO[o.id]} />
              )}
            </React.Fragment>
          ))}

          {applied && !paySuccess && chooseAnother}

          {paySuccess && <Alert type="success" message={`✓ ${LABELS[method]} confirmed — you're all set!`} />}
          {/* Step 1 Continue applies the pick (disabled until one is made); step 2 Continue submits */}
          {!applied
            ? <div style={{ marginTop:4 }}><Btn onClick={() => { setApplied(method); setErrors({}); }} disabled={!method}>Continue</Btn></div>
            : !paySuccess && <div style={{ marginTop:4 }}><Btn onClick={confirm}>Continue</Btn></div>}
        </div>
      </AutoHeight>
    </AccordionSection>
  );
}

/* Stand-in for the native wallet sheet. It deliberately shows everything the real
   sheet shows, because that's what makes express safe without an interstitial
   review screen: the format is named (so a both-format link can't silently sell
   the default), the total is itemised, and shipping method is picked here rather
   than by bouncing the buyer back out to the checkout. `format` is omitted when
   opened from inside checkout, where the order is already on screen. */
function ExpressModal({ method, format, qty = 1, onClose, onConfirm }) {
  const [ship, setShip] = useState(SHIPPING_OPTS[0].id);
  if (!method) return null;

  const detailed = !!format;
  const ships    = detailed && hasPrint(format);
  const shipCost = ships ? SHIPPING_OPTS.find(o => o.id === ship).price : 0;
  const subtotal = detailed ? subtotalOf(format, qty) : 0;
  const saving   = detailed ? savingOf(format) : 0;
  const tax      = detailed ? Math.round((subtotal - saving) * 0.08 * 100) / 100 : 0;
  const total    = subtotal - saving + shipCost + tax;
  const row = (label, value, bold) => (
    <div style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:13,
      fontWeight: bold ? 700 : 400, color:T.textBold, padding:"3px 0" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderTopLeftRadius:14, borderTopRightRadius:14,
        padding:24, maxWidth:420, width:"100%", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -8px 40px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:4 }}>
          <h3 style={{ fontSize:18, fontWeight:700, color:T.textBold }}>{method}</h3>
          <button onClick={onClose} aria-label="Cancel" style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}>
            <Ms name="close" size={20} color={T.textSubtle} />
          </button>
        </div>
        <p style={{ fontSize:12, color:T.textSubtle, marginBottom:16 }}>
          Stand-in for the native {method} sheet — same information, so nothing is authorized unseen.
        </p>

        {detailed ? (
          <>
            {/* Naming the format is what makes express safe on a both-format link */}
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginBottom:12 }}>
              {lineItems(format, qty).map(item => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:T.textBold, lineHeight:1.5 }}>
                    <strong>{PRODUCT.title}</strong><br />
                    <span style={{ color:T.textSubtle }}>{item.kind} · qty {item.qty}</span><br />
                    <span style={{ color:T.textSubtle }}>{item.fulfil === "ship" ? "Ships to you" : "Instant download"}</span>
                  </span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.textBold, whiteSpace:"nowrap" }}>{money(item.total)}</span>
                </div>
              ))}
            </div>

            {ships ? (
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginBottom:12 }}>
                <p style={{ fontSize:13, fontWeight:700, color:T.textBold, marginBottom:6 }}>Ship to</p>
                <p style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5, marginBottom:10 }}>
                  Alex Reader · 580 California St, San Francisco, CA 94104
                </p>
                {/* Shipping method is chosen in the sheet — bouncing back out to pick it
                    would undo the whole point of express. */}
                <p style={{ fontSize:13, fontWeight:700, color:T.textBold, marginBottom:6 }}>Delivery</p>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {SHIPPING_OPTS.map(o => (
                    <label key={o.id} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, cursor:"pointer", color:T.textBold }}>
                      <input type="radio" name="expressShip" checked={ship===o.id} onChange={() => setShip(o.id)} style={{ accentColor:T.brand }} />
                      <span style={{ flex:1 }}>{o.label} — {o.desc}</span>
                      <span style={{ fontWeight:600 }}>{money(o.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginBottom:12 }}>
                <p style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
                  <strong style={{ color:T.textBold }}>No delivery needed.</strong> {method} shares only your email and
                  a billing postal code for tax.
                </p>
              </div>
            )}

            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:8, marginBottom:16 }}>
              {row("Subtotal", money(subtotal))}
              {saving > 0 && row("Bundle saving", `-${money(saving)}`)}
              {ships && row("Shipping", money(shipCost))}
              {row("Tax", money(tax))}
              <div style={{ borderTop:`1px solid ${T.border}`, marginTop:4 }}>{row(`Pay Blurb`, money(total), true)}</div>
            </div>
          </>
        ) : (
          <p style={{ color:T.textSubtle, marginBottom:20, fontSize:14 }}>
            You would be redirected to {method} to authorize and complete your purchase securely.
          </p>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onConfirm(ships ? ship : null)}>Authorize with {method}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ CHECKOUT LAYOUT ═══════════════════════════ */
function CheckoutLayout({ children, summaryProps, onBackToCart }) {
  const { isMobile, isDesktop } = useViewport();
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <Header />
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding: isMobile ? "0 20px 40px" : "0 40px 60px", maxWidth:1210, margin:"0 auto", width:"100%" }}>
        {onBackToCart ? (
          <button onClick={onBackToCart}
            style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:"16px 0", alignSelf:"flex-start" }}>
            <Ms name="shopping_cart" size={22} color={T.brand} />
            <span style={{ fontSize:14, fontWeight:600, color:T.textLink, textDecoration:"underline" }}>Back to cart</span>
          </button>
        ) : <div style={{ height:24 }} />}
        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexDirection: isDesktop ? "row" : "column" }}>
          <div style={{ flex: isDesktop ? "1 1 520px" : undefined, width: isDesktop ? "auto" : "100%", maxWidth: isDesktop ? 730 : "100%", display:"flex", flexDirection:"column", gap:14 }}>
            {children}
          </div>
          <div style={{ flexShrink:0, width: isDesktop ? 380 : "100%", position: isDesktop ? "sticky" : "static", top:20 }}>
            <OrderSummary {...summaryProps} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function CheckoutView({ order, onPlaceOrder, onBackToCart }) {
  const [expressModal, setExpressModal] = useState(null);
  const [guestDone, setGuestDone] = useState(false);

  /* A true accordion: exactly ONE section open at a time. This used to be four
     independent booleans whose open/close helpers didn't touch each other at all
     (`{...s, [k]:true}`), so Express, the guest step and any shipping section could
     all sit expanded at once. Matches the regular checkout in App.jsx — keep the
     two in step.

     Sections: "express" | "guest" | "shipping" | "opt" | "payment" | null. Starts
     on the guest step, the first thing the buyer has to act on; Express starts
     collapsed because it can no longer share the screen with it. */
  const [openSection, setOpenSection] = useState("guest");
  const secOpen = k => openSection === k;
  const open    = k => setOpenSection(k);
  const close   = k => setOpenSection(s => (s === k ? null : s));
  const toggle  = k => setOpenSection(s => (s === k ? null : k));

  /* Nothing physical in the order means no shipment: both shipping sections drop
     out and the flow is Email → Payment. Location is still needed for tax on
     digital goods, so Payment collects a billing address instead. */
  const ships = hasPrint(order.format);

  const guestContinue = email => { order.setEmail(email); setGuestDone(true); open(ships ? "shipping" : "payment"); };
  const shipDone = addr => { order.setShippingAddr(addr); open("opt"); };
  const methodDone = (id, cost) => { order.setShippingMethod(id); order.setShippingCost(cost); open("payment"); };
  const payDone = () => { order.setPaymentDone(true); close("payment"); };

  const taxReady = ships
    ? !!order.shippingAddr
    : !!(order.billingAddr?.country && order.billingAddr?.zip);

  const summaryProps = {
    format: order.format, qty: order.qty,
    appliedCode: order.appliedCode, onApplyCode: order.setAppliedCode,
    shippingCost: order.shippingCost, taxReady,
    paymentDone: order.paymentDone, onPlaceOrder,
  };

  return (
    <CheckoutLayout summaryProps={summaryProps} onBackToCart={onBackToCart}>
      <ExpressModal method={expressModal} onClose={() => setExpressModal(null)} onConfirm={() => { setExpressModal(null); onPlaceOrder(); }} />
      <ExpressCheckout open={secOpen("express")} onToggle={() => toggle("express")} onExpressSelect={setExpressModal} digitalOnly={!ships} />
      <OrDivider />
      <GuestSignIn open={secOpen("guest")} onToggle={() => toggle("guest")} completed={guestDone} email={order.email} onContinue={guestContinue} />
      {ships && (
        <>
          <ShippingAddress open={secOpen("shipping")} onToggle={() => toggle("shipping")} savedAddress={order.shippingAddr}
            onComplete={shipDone} onModify={() => { order.setShippingAddr(null); open("shipping"); }} />
          <ShippingOptions open={secOpen("opt")} onToggle={() => toggle("opt")} disabled={!order.shippingAddr} savedMethod={order.shippingMethod} onConfirm={methodDone} />
        </>
      )}
      <Payment open={secOpen("payment")} onToggle={() => toggle("payment")}
        disabled={ships ? !order.shippingMethod : !guestDone}
        completed={order.paymentDone && !secOpen("payment")} onComplete={payDone}
        requireBilling={!ships} billing={order.billingAddr} setBilling={order.setBillingAddr} />
    </CheckoutLayout>
  );
}

/* ═══════════════════════════ ORDER CONFIRMATION ═══════════════════════════ */
function CreateAccountPanel({ email, heading, sub }) {
  const [em, setEm] = useState(email || "");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [created, setCreated] = useState(false);
  const [errors, setErrors] = useState({});
  const fill = () => { if (!pw) { setPw("Demo1234"); setErrors({}); } };
  const create = () => {
    const e = {};
    if (!em || !em.includes("@")) e.email = "Enter a valid email address";
    if (!pw || pw.length < 6) e.pw = "Password must be at least 6 characters";
    if (Object.keys(e).length) return setErrors(e);
    setCreated(true);
  };
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24 }}>
      {created ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <IconCheckCircle size={24} /><span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Account created!</span>
          </div>
          <Divider />
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
            Your account has been created for <strong style={{ color:T.textBold }}>{em}</strong>. Your order is now linked —
            sign in any time to track it, reorder, and manage returns without your email link.
          </p>
          <div><Btn>Sign in to your account</Btn></div>
        </div>
      ) : (
        <>
          <p style={{ fontSize:18, fontWeight:700, color:T.textBold, marginBottom:8 }}>{heading}</p>
          <p style={{ fontSize:14, color:T.textSubtle, marginBottom:16, lineHeight:1.5 }}>{sub}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {/* Email is the guest's order email — locked, not editable */}
              <Input label="Email address" required type="email" value={em} disabled />
              <Input label="Password" required placeholder="Create a password" type={showPw ? "text" : "password"}
                value={pw} onChange={v => { setPw(v); setErrors({}); }} hint="At least 6 characters" error={errors.pw} onClick={fill}
                rightIcon={<button onClick={() => setShowPw(s => !s)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex" }}><Ms name={showPw ? "visibility" : "visibility_off"} size={18} color={T.textSubtle} /></button>} />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold }}>
              <input type="checkbox" checked={marketing} onChange={() => setMarketing(m => !m)} style={{ accentColor:T.brand, width:16, height:16 }} />
              Yes, send me book-making tips, design inspiration, and exclusive offers.
            </label>
            <div><Btn onClick={create}>Create free account</Btn></div>
          </div>
        </>
      )}
    </div>
  );
}

/* The digital half of an order is ready the moment payment clears — it is never
   gated on the printed copy shipping. */
function DownloadPanel({ compact }) {
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"14px 16px",
      background:T.panel, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Ms name="download" size={20} color={T.brand} />
        <span style={{ fontSize:15, fontWeight:700, color:T.textBold }}>Your PDF is ready now</span>
      </div>
      <div style={{ fontSize:13, color:T.textSubtle, lineHeight:1.6 }}>
        <div>{PDF_FILE.name} · {PDF_FILE.size}</div>
        {!compact && <div>The same link is in your confirmation email, and you can re-download it any time from your order page.</div>}
      </div>
      <div><Btn>Download PDF</Btn></div>
    </div>
  );
}

/* Cancelling is irreversible and money moves, so it asks first. Ported from the
   regular flow's confirmation (App.jsx) — the two files keep their own primitives
   on purpose, so this is a copy rather than an import, and the wording is kept
   identical deliberately: the same action shouldn't read differently depending on
   which surface the buyer bought from.

   It never says "Cancel" on a button. In a cancellation dialog that word can mean
   either action, so the safe one is "Keep order". */
function ConfirmCancelDialog({ open, refund, onKeep, onCancelOrder }) {
  if (!open) return null;
  return (
    <div onClick={onKeep} role="dialog" aria-modal="true" aria-label="Cancel this order"
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:8, padding:24, width:460, maxWidth:"100%",
          display:"flex", flexDirection:"column", gap:12 }}>
        <p style={{ fontSize:20, fontWeight:700, color:T.textBold }}>Cancel this order?</p>
        <p style={{ fontSize:16, color:T.textBold, lineHeight:1.5 }}>
          We'll stop your order and refund <strong>{refund}</strong> to the card you used.
          Refunds take 3–5 business days.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
          <Btn variant="secondary" onClick={onKeep}>Keep order</Btn>
          <button onClick={onCancelOrder}
            style={{ height:40, padding:"0 20px", borderRadius:T.radius, border:"none",
              background:T.textError, color:"#fff", fontSize:16, fontWeight:600, cursor:"pointer" }}>
            Cancel order
          </button>
        </div>
      </div>
    </div>
  );
}

/* Whether this order is still inside its cancellation window. A scenario constant
   like SELLS_DIGITAL above — flipping it gives the expired screen, which is the only
   other state this page can be in. Matches CANCEL_WINDOW_OPEN in App.jsx. */
const CANCEL_WINDOW_OPEN = true;

function OrderConfirmation({ order }) {
  const method = SHIPPING_OPTS.find(o => o.id === order.shippingMethod) || SHIPPING_OPTS[0];
  const a = order.shippingAddr;
  const ships   = hasPrint(order.format);
  const digital = hasDigital(order.format);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelled,     setCancelled]     = useState(false);
  /* Line totals only, not shipping — same basis as the regular flow's refund. */
  const refund = subtotalOf(order.format, order.qty) - savingOf(order.format);
  /* Nothing is printed on a digital-only order, so there is nothing to stop. */
  const cancelWindowOpen = CANCEL_WINDOW_OPEN && !cancelled && ships;

  return (
    <CheckoutLayout
      summaryProps={{ format:order.format, qty:order.qty, appliedCode:order.appliedCode, shippingCost:order.shippingCost, taxReady:true, orderPlaced:true }}>
      <ConfirmCancelDialog open={confirmCancel} refund={money(refund)}
        onKeep={() => setConfirmCancel(false)}
        onCancelOrder={() => { setConfirmCancel(false); setCancelled(true); }} />
      <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24 }}>
        {/* No tick on a cancellation — a success mark reads as congratulations */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          {!cancelled && <IconCheckCircle size={24} />}
          <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>
            {cancelled ? "Order canceled" : ships ? "Your order is complete" : "Your download is ready"}
          </span>
        </div>
        <Divider />
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16 }}>
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
            {cancelled ? "We've emailed your cancellation to " : "A confirmation email has been sent to "}
            <strong style={{ color:T.textBold }}>{order.email || DEMO_BUYER_EMAIL}</strong>.
            If you don't see it, check your spam or bulk folder.
          </p>
          <p style={{ fontSize:15, color:T.textBold }}>Order number: <a href="#" style={{ color:T.textLink, fontWeight:700, textDecoration:"none" }}>{ORDER_NUMBER}</a></p>

          {/* Two outcomes on two timelines when the order is mixed: the download is
              available immediately, the printed copy is still in production. */}
          {digital && <DownloadPanel />}

          {/* Two headings, two ideas — same split as App.jsx's confirmation. The heading
              said "Shipping to:" and the next line answered with a delivery service.
              Keep the two files in step on this one. */}
          {/* Nothing is shipping once the order is cancelled, so the block goes
              rather than describing a book that won't arrive. */}
          {ships && !cancelled && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:4 }}>Shipping to</p>
                {a && (
                  <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
                    <div>{a.firstName} {a.lastName}</div>
                    {a.address && <div>{a.address}{a.address2 ? `, ${a.address2}` : ""}</div>}
                    <div>{[`${a.city},`, a.state, a.zip].filter(Boolean).join(" ")}</div>
                    <div>{a.country}</div>
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:4 }}>Delivery</p>
                <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
                  {method.label} · Arrives by {method.arrive}
                </div>
              </div>
            </div>
          )}

          {/* Cancelling used to send the buyer to the guest order portal. The portal
              isn't being built, so it happens here instead — the same place, and the
              same wording, as the regular flow's confirmation. Once the window closes
              the control is removed rather than disabled: it can't reopen, so a dead
              button would only invite clicking, and the sentence carries the reason. */}
          {cancelled ? (
            <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
              We've refunded <strong style={{ color:T.textBold }}>{money(refund)}</strong> to the
              card you used. Refunds take 3–5 business days.
              {digital && " Your PDF isn't refundable and stays available to download."}
            </p>
          ) : (
            <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
              {ships ? (
                cancelWindowOpen
                  ? "You can cancel this order within about three hours of placing it. "
                  : "The three-hour window to cancel this order has passed. "
              ) : (
                <>PDF purchases are non-refundable and can't be canceled. If the file won't open
                or download,{" "}
                <a href="#" style={{ color:T.textLink, textDecoration:"underline" }}>report a problem</a>{" "}
                and we'll sort it out. </>
              )}
              <a href="#" style={{ color:T.textLink, textDecoration:"underline" }}>Read the returns and refunds FAQ</a>.
            </p>
          )}
          {cancelWindowOpen && (
            /* A button, not a link — it acts rather than navigates, so keyboard and
               screen-reader behaviour should follow the action. Styled as a link
               because the page's job is reassurance, not offering an exit. */
            <button onClick={() => setConfirmCancel(true)}
              style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0,
                cursor:"pointer", color:T.textLink, fontSize:16, fontWeight:600,
                textDecoration:"underline" }}>
              Cancel order
            </button>
          )}
          {/* The "Preview the confirmation email → Open email" strip was here. It was a
              way to walk the demo into the email screen, not something a buyer would
              ever see, so it doesn't belong on the page. The email stage is still
              reachable from the demo stepper and from ?stage=email. */}
        </div>
      </div>

      <CreateAccountPanel email={order.email}
        heading={digital ? "Keep your download in one place" : "Save order details for next time"}
        sub={digital
          ? "Your download link works without an account. Create a free one and your library keeps the PDF, so you never have to find the email again."
          : "Create a free account to track your order, reorder books, and manage your projects"} />
    </CheckoutLayout>
  );
}

/* ═══════════════════════════ CONFIRMATION EMAIL ═══════════════════════════ */
function EmailStepper() {
  const steps = ["Ordered", "Shipped", "In transit", "Out for delivery", "Delivered"];
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0a5a80", padding:"14px 20px" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background: i===0 ? "#fff" : "rgba(255,255,255,.35)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              {i===0 && <Ms name="check" size={12} color="#0a5a80" fill={1} />}
            </div>
            <span style={{ fontSize:9, color: i===0 ? "#fff" : "rgba(255,255,255,.7)", whiteSpace:"nowrap" }}>{s}</span>
          </div>
          {i < steps.length-1 && <div style={{ flex:1, height:2, background:"rgba(255,255,255,.3)", margin:"0 4px", marginBottom:16 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ConfirmationEmail({ order, onBack }) {
  const method = SHIPPING_OPTS.find(o => o.id === order.shippingMethod) || SHIPPING_OPTS[0];
  const a = order.shippingAddr || {};
  const ships    = hasPrint(order.format);
  const digital  = hasDigital(order.format);
  const items    = lineItems(order.format, order.qty);
  const subtotal = subtotalOf(order.format, order.qty);
  const saving   = savingOf(order.format);
  const disc = order.appliedCode ? PROMO_CODES[order.appliedCode] : 0;
  const tax = Math.round((subtotal - saving) * 0.08 * 100) / 100;
  const total = subtotal - saving - disc + (order.shippingCost || 0) + tax;
  const row = (label, val, bold) => (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:T.textBold, fontWeight: bold ? 700 : 400, padding:"3px 0" }}>
      <span>{label}</span><span>{val}</span>
    </div>
  );
  const cell = { padding:"8px 6px", fontSize:12, color:T.textBold, borderBottom:"1px solid #eee", verticalAlign:"top" };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <Header />
      <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        {/* email-client chrome */}
        <div style={{ width:"100%", maxWidth:640, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, color:T.textLink, fontWeight:600, fontSize:14 }}>
            <Ms name="arrow_back" size={18} color={T.textLink} /> Back to confirmation
          </button>
          <span style={{ fontSize:12, color:T.textSubtle }}>Transactional email preview</span>
        </div>

        <div style={{ width:"100%", maxWidth:640, background:T.surface, borderRadius:8, overflow:"hidden", boxShadow:"0 6px 24px rgba(0,0,0,.12)" }}>
          {/* subject bar */}
          <div style={{ padding:"14px 20px", borderBottom:"1px solid #eee" }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.textBold }}>Your Blurb order is confirmed — #{ORDER_NUMBER}</div>
            <div style={{ fontSize:12, color:T.textSubtle, marginTop:2 }}>Blurb &lt;orders@blurb.com&gt; · to {order.email || DEMO_BUYER_EMAIL}</div>
          </div>

          {/* header */}
          <div style={{ background:"#107eb1", padding:"26px 20px", textAlign:"center" }}>
            <img src={BLURB_LOGO_EMAIL} alt="Blurb" style={{ height:44, width:"auto", marginBottom:12, display:"inline-block" }} />
            <div style={{ fontSize:24, fontWeight:700, color:"#fff" }}>Thank you for your order!</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.85)", marginTop:6 }}>
              {ships ? "We'll send a confirmation once your book has shipped." : "Your PDF is ready to download."}
            </div>
          </div>
          {/* A shipment tracker on a download-only order tracks nothing */}
          {ships && <EmailStepper />}

          <div style={{ padding:"22px 24px" }}>
            <p style={{ fontSize:13, color:T.textBold, marginBottom:14 }}>Order number: <strong>{ORDER_NUMBER}</strong></p>
            <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:8 }}>Order summary</p>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
              <thead>
                <tr>
                  <th style={{ ...cell, textAlign:"left", fontWeight:700, color:T.textSubtle }}>Title</th>
                  <th style={{ ...cell, textAlign:"center", fontWeight:700, color:T.textSubtle, width:50 }}>Qty</th>
                  <th style={{ ...cell, textAlign:"right", fontWeight:700, color:T.textSubtle, width:80 }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={cell}><strong>{item.title}</strong><br />
                      <span style={{ color:T.textSubtle }}>{item.kind} · {item.lines.join(" · ")}</span></td>
                    <td style={{ ...cell, textAlign:"center" }}>{item.qty}</td>
                    <td style={{ ...cell, textAlign:"right" }}>{money(item.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ maxWidth:280, marginLeft:"auto" }}>
              {row("Subtotal", money(subtotal))}
              {saving > 0 && row("Bundle saving", `-${money(saving)}`)}
              {disc > 0 && row("Discount", `-${money(disc)}`)}
              {ships && row("Shipping", money(order.shippingCost || 0))}
              {row("Tax", money(tax))}
              <div style={{ borderTop:"1px solid #ddd", marginTop:4 }}>{row("Total", money(total), true)}</div>
            </div>

            {/* The download link lives in the email too — it's the guest's durable
                copy, so it never waits on the printed book. */}
            {digital && (
              <div style={{ marginTop:20, border:`1px solid ${T.border}`, borderRadius:6, background:T.panel, padding:"14px 16px", textAlign:"center" }}>
                <p style={{ fontSize:14, fontWeight:700, color:T.textBold }}>Your PDF is ready</p>
                <p style={{ fontSize:12, color:T.textSubtle, margin:"4px 0 10px" }}>{PDF_FILE.name} · {PDF_FILE.size}</p>
                <a href="#" style={{ display:"inline-block", background:T.brand, color:"#fff", borderRadius:T.radius,
                  padding:"9px 22px", fontSize:13, fontWeight:600, textDecoration:"none" }}>Download PDF</a>
              </div>
            )}

            <div style={{ display:"flex", gap:24, marginTop:20, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <p style={{ fontSize:13, fontWeight:700, color:T.textBold, marginBottom:4 }}>Delivery details</p>
                <div style={{ fontSize:12, color:T.textSubtle, lineHeight:1.6 }}>
                  {ships ? (
                    <>
                      <div>{a.firstName} {a.lastName}</div>
                      {a.address && <div>{a.address}</div>}
                      <div>{[a.city, a.state, a.zip].filter(Boolean).join(", ")}</div>
                      <div>{a.country}</div>
                      <div style={{ marginTop:6 }}><strong>{method.label}</strong> · Arrives by {method.arrive}</div>
                    </>
                  ) : (
                    <>
                      <div>Delivered to {order.email || DEMO_BUYER_EMAIL}</div>
                      <div style={{ marginTop:6 }}><strong>Instant download</strong> · nothing to ship</div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ flex:1, minWidth:150 }}>
                <p style={{ fontSize:13, fontWeight:700, color:T.textBold, marginBottom:4 }}>Order date</p>
                <div style={{ fontSize:12, color:T.textSubtle }}>{ORDER_DATE}</div>
                <p style={{ fontSize:13, fontWeight:700, color:T.textBold, margin:"10px 0 4px" }}>Payment type</p>
                <div style={{ fontSize:12, color:T.textSubtle }}>•••• •••• •••• 4242</div>
              </div>
            </div>
          </div>

          {/* "How your book gets made" only belongs on an order that gets printed */}
          {ships && (
            <>
              <div style={{ position:"relative", background:"linear-gradient(120deg,#2b2b2b,#555)", height:180, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(255,255,255,.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ms name="play_arrow" size={34} color="#2b2b2b" fill={1} />
                </div>
              </div>
              <div style={{ padding:"18px 24px", textAlign:"center", borderBottom:"1px solid #eee" }}>
                <p style={{ fontSize:16, fontWeight:700, color:T.textBold }}>How your book gets made</p>
                <p style={{ fontSize:12, color:T.textSubtle, margin:"4px 0 10px" }}>Go behind the scenes at one of the world's best book-printing facilities.</p>
                <button style={{ background:"none", border:`1px solid ${T.brand}`, color:T.brand, borderRadius:T.radius, padding:"7px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Watch now</button>
              </div>
            </>
          )}

          {/* Blurb difference */}
          <div style={{ padding:"22px 24px" }}>
            <p style={{ fontSize:16, fontWeight:700, color:T.textBold, textAlign:"center", marginBottom:16 }}>The Blurb difference</p>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[["menu_book","True bookstore-grade quality","Rich formats, true color, and a genuine bookstore feel."],
                ["verified","Backed by 20 years of expertise","Consistent quality from cover to finish, every time."],
                ["eco","Sustainable papers & practices","Made in the US with Forest Stewardship Council–certified papers."]].map(([ic,t,d]) => (
                <div key={t} style={{ flex:1, minWidth:150, textAlign:"center" }}>
                  <Ms name={ic} size={26} color={T.brand} />
                  <p style={{ fontSize:13, fontWeight:700, color:T.textBold, margin:"8px 0 4px" }}>{t}</p>
                  <p style={{ fontSize:11, color:T.textSubtle, lineHeight:1.5 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:"#1c1c1c", padding:"20px 24px", textAlign:"center" }}>
            <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:10 }}>
              {["public","thumb_up","photo_camera","music_note"].map(ic => (
                <span key={ic} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ms name={ic} size={16} color="#fff" />
                </span>
              ))}
            </div>
            <p style={{ fontSize:11, color:"#bbb" }}>©2015–2026 RPI Print, Inc. · Privacy · Unsubscribe</p>
          </div>
        </div>

      </div>
    </div>
  );
}


/* ═══════════════════════════ DEMO NAV ═══════════════════════════ */
/* Three fixed zones — identity, navigation, settings — rather than one centred
   row of everything. The old bar put a build warning, five scenario controls and
   two different navigation idioms at the same visual level, separated by middots,
   inside a `justify-content:center` + `flex-wrap` row: every control moved when
   the window resized or when the conditional "Ordered" select appeared, so no
   control had a position worth remembering.

   Each zone is now an atomic unit pinned to its own edge. On a narrow viewport
   the zones stack, but nothing inside a zone rearranges.

   `short` is what the stepper shows; `label` is the full name, kept for the
   tooltip and the accessible name. Five full labels can't hold one row on a
   laptop, and a stepper that wraps stops reading as a sequence. */
const STAGES = [
  { key:"setup",    short:"Setup",    label:"Link setup" },
  { key:"pdp",      short:"PDP",      label:"Product page" },
  { key:"checkout", short:"Checkout", label:"Checkout" },
  { key:"confirm",  short:"Confirm",  label:"Confirmation" },
  { key:"email",    short:"Email",    label:"Email" },
];

const DEMO_SELECT = { fontSize:12, fontWeight:600, color:T.textBold, background:T.surface,
  border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"4px 8px", cursor:"pointer" };

/* 28px square, matching the height of the selects beside it */
const demoIconBtn = on => ({ display:"inline-flex", alignItems:"center", justifyContent:"center",
  position:"relative", width:28, height:28, padding:0, flexShrink:0, cursor:"pointer",
  background: on ? T.brand : T.surface, borderRadius:T.radius,
  border:`1px solid ${on ? T.brand : T.border}` });
/* Work-in-progress marker — mirrors the one in App.jsx. Duplicated rather than
   imported because this file is deliberately self-contained (its own tokens and
   primitives); the branch value comes from the same build-time define. */
const BRANCH = typeof __BRANCH__ === "string" ? __BRANCH__ : "unknown";
const IS_WIP = BRANCH !== "main";

/* An outline chip rather than the solid dark-amber fill it started as. A saturated
   block pulled the eye on every screen, and this marker only has to be *found* when
   someone asks "is this approved?" — it doesn't have to interrupt. The same brown
   is still here as the ink, so it stays recognisably a caution and still survives
   being screenshotted into a deck, which is the only reason it exists.
   Mirrored in App.jsx — keep the three values in step. */
const WIP_INK    = "#7a3d00";
const WIP_BG     = "#fbf3e6";
const WIP_BORDER = "#e0c79c";

/* Rides inside the demo bar instead of taking a full row above it — two stacked
   bars were more chrome than the screen below them could afford. It keeps the
   amber and the icon, because the reason this marker exists is to survive being
   screenshotted into a deck where the URL doesn't come along, and a chip that
   matched the demo bar's grey wouldn't.

   The second sentence ("use the production link") moves to the tooltip. What has
   to read at a glance is that this build isn't approved; where to find the
   approved one can afford a hover. */
function WipChip() {
  /* Measured rather than done with a media query because everything else here
     styles inline. 560px is this bar's own breakpoint, not one of useViewport's —
     it's where the chip stops fitting beside the switcher. */
  const narrow = useViewport().width < 560;
  if (!IS_WIP) return null;
  /* Shortens rather than wrapping below 560px. Wrapping cost a whole extra row on
     the one screen size that can least afford it, and the full sentence is in the
     tooltip either way. What can't be dropped at any width is the amber, the icon
     and the words "not approved" — that's what has to survive a screenshot. */
  return (
    <span title={`Work in progress — not approved. Exploratory build for review on branch ${BRANCH}. For the approved flow, use the production link.`}
      style={{ display:"inline-flex", alignItems:"center", gap:6, minWidth:0, whiteSpace:"nowrap",
        background:WIP_BG, color:WIP_INK, border:`1px solid ${WIP_BORDER}`,
        borderRadius:T.radius, padding:"2px 8px",
        fontSize:12, fontWeight:600, lineHeight:1.4, cursor:"help" }}>
      <span className="ms" style={{ fontSize:14 }}>construction</span>
      {narrow ? "WIP — not approved" : "Work in progress — not approved"}
      {!narrow && (
        <span style={{ opacity:.75, fontWeight:400, fontFamily:"monospace", fontSize:11 }}>{BRANCH}</span>
      )}
    </span>
  );
}

/* NAVIGATION ZONE — the buyer journey is linear, so the control that walks it is
   drawn as a sequence: one bordered track, chevrons between stops, the current
   stop filled. Five identical pills separated by nothing couldn't say that, and
   nothing distinguished them from the scenario dropdowns sitting alongside.

   It scrolls rather than wraps: a stepper broken across two lines stops reading
   as an order of events. */
function StageStepper({ view, onJump, skippedStages }) {
  return (
    /* Takes the space the two zones don't and centres itself in it, rather than
       sitting wherever the identity zone happens to end. */
    <div style={{ flex:"1 1 auto", minWidth:0, overflowX:"auto", display:"flex", justifyContent:"center" }}>
      <div style={{ display:"flex", alignItems:"center", flexShrink:0, padding:2, gap:2,
        background:T.surface, border:`1px solid ${T.borderSubtle}`, borderRadius:T.radius }}>
        {STAGES.map((s, i) => {
          /* A stage the current path never visits is struck through and inert, so
             it's clear the flow skipped it rather than that it's merely unselected. */
          const skipped = skippedStages.includes(s.key);
          const active  = view === s.key;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <Ms name="chevron_right" size={14} color={T.borderSubtle} style={{ flexShrink:0 }} />}
              <button onClick={skipped ? undefined : () => onJump(s.key)} disabled={skipped}
                aria-current={active ? "step" : undefined}
                title={skipped ? `${s.label} — skipped, paid with express checkout from the product page` : s.label}
                style={{ flexShrink:0, whiteSpace:"nowrap", border:"none", borderRadius:2,
                  background: active ? T.brand : "transparent",
                  color: active ? "#fff" : skipped ? T.textDisabled : T.textBold,
                  textDecoration: skipped ? "line-through" : "none",
                  padding:"3px 8px", fontSize:12, fontWeight:600,
                  cursor: skipped ? "not-allowed" : "pointer" }}>
                {s.short}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <label style={{ display:"block" }}>
      <span style={{ display:"block", marginBottom:4, fontSize:12, fontWeight:700, color:T.textBold }}>{label}</span>
      {children}
      {hint && <span style={{ display:"block", marginTop:4, fontSize:11, lineHeight:1.4, color:T.textDisabled }}>{hint}</span>}
    </label>
  );
}

/* SETTINGS ZONE — the three scenario controls describe the *situation* being
   demoed, not the screen being viewed, so they're grouped behind one button
   instead of interleaved with navigation. The gear carries a dot whenever any of
   them is off its default, because otherwise a screenshot of a non-default
   scenario looks identical to the default one. */
const PANEL_W = 248;

function DemoSettings({ variant, onVariantChange, format, onFormatChange, expressStyle, onExpressStyleChange }) {
  const [open, setOpen] = useState(false);
  /* One variant means the seller has no choice to make, so the control describes a
     fixed fact rather than offering a switch. */
  const oneVariant = Object.keys(LINK_VARIANTS).length === 1;
  /* Placed against the viewport rather than anchored `right:0` to the button. When
     the zones stack at phone width this button wraps to the left edge, and a panel
     hung off its right corner opened straight off the side of the screen. */
  const [pos, setPos] = useState({ top:0, left:0 });
  const ref = useRef(null);
  const btnRef = useRef(null);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 6,
      left: Math.max(8, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - 8)) });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey  = e => { if (e.key === "Escape") setOpen(false); };
    /* Fixed positioning would leave the panel behind if the page moved under it */
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", place); };
  }, [open]);

  const modified = variant !== "print" || expressStyle !== "single" || format !== defaultFormat(variant);

  return (
    <span ref={ref} style={{ display:"inline-flex" }}>
      <button ref={btnRef} onClick={() => { if (!open) place(); setOpen(o => !o); }}
        aria-expanded={open} aria-label="Demo settings"
        title="Demo settings — what this link offers, what was ordered, express treatment"
        style={demoIconBtn(open)}>
        <Ms name="tune" size={16} color={open ? "#fff" : T.textSubtle} />
        {modified && !open && (
          <span style={{ position:"absolute", top:-2, right:-2, width:8, height:8, borderRadius:"50%",
            background:T.brand, border:"1px solid #f0f0f0" }} />
        )}
      </button>
      {open && (
        /* Above the page's sticky header (20) but below the cart drawer (120),
           which covers the bar anyway while it's open. */
        <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:110, width:PANEL_W,
          background:T.surface, border:`1px solid ${T.borderSubtle}`, borderRadius:T.radius,
          boxShadow:"0 4px 14px rgba(20,20,20,.18)", padding:12, textAlign:"left",
          display:"flex", flexDirection:"column", gap:12 }}>
          {/* Disabled with a reason rather than hidden while a link can only sell
              print — hiding it would drop a control out of the middle of the list,
              and "why can't I change this?" is the question the hint answers. */}
          <SettingRow label="This link offers"
            hint={oneVariant
              ? "A checkout link sells the printed book. The PDF is bought from the regular Blurb flow."
              : "What the seller enabled. Changing it restarts the demo."}>
            <select value={variant} onChange={e => onVariantChange(e.target.value)}
              disabled={oneVariant}
              aria-label="Formats offered on this checkout link"
              style={{ ...DEMO_SELECT, width:"100%",
                ...(oneVariant && { color:T.textDisabled, background:T.bg, cursor:"not-allowed" }) }}>
              {Object.values(LINK_VARIANTS).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </SettingRow>
          {/* Shown disabled rather than hidden on single-format links. Hiding it was
              what made the old row insert a control mid-sequence; disabled, it also
              explains why there's nothing to choose. */}
          <SettingRow label="The buyer ordered"
            hint={variant === "both"
              ? "The only way to reach a mixed order from a post-order stage without walking the PDP first."
              : "A single-format link leaves the buyer nothing to choose."}>
            <select value={format} onChange={e => onFormatChange(e.target.value)}
              disabled={variant !== "both"} aria-label="What the buyer ordered"
              style={{ ...DEMO_SELECT, width:"100%",
                ...(variant !== "both" && { color:T.textDisabled, background:T.bg, cursor:"not-allowed" }) }}>
              {LINK_VARIANTS[variant].choices.map(id => <option key={id} value={id}>{FORMATS[id].label}</option>)}
            </select>
          </SettingRow>
          <SettingRow label="Express treatment"
            hint="Compare the two on the product page and cart drawer.">
            <select value={expressStyle} onChange={e => onExpressStyleChange(e.target.value)}
              aria-label="Express checkout button treatment" style={{ ...DEMO_SELECT, width:"100%" }}>
              {Object.entries(EXPRESS_STYLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </SettingRow>
          <p style={{ margin:0, paddingTop:10, borderTop:`1px solid ${T.borderSubtle}`,
            fontSize:11, lineHeight:1.5, color:T.textDisabled }}>
            Click any form field to auto-fill it with sample data.
          </p>
        </div>
      )}
    </span>
  );
}

/* IDENTITY ZONE — which prototype, not which screen; the stepper handles screens.
   It used to list the regular flow's four screens here, which put two different
   jobs in one control and made this switcher the only place in the build where a
   screen could be chosen from a dropdown instead of the stepper.

   The switcher's own value also names where you are, so the old "Checkout Link
   demo" caption beside it was saying it twice. The auto-fill hint that caption
   carried moves into the settings panel: clicking a field discovers it in one
   second, and it was costing a permanent line of chrome on a bar that lands in
   every screenshot.

   Mirrors FlowSwitcher in App.jsx — keep the options in step. */
function FlowSwitcher({ onSwitchFlow }) {
  if (!onSwitchFlow)
    return <strong style={{ fontSize:12, color:T.textBold }}>Checkout Link demo</strong>;
  return (
    <select value="checkout-link" onChange={e => onSwitchFlow(e.target.value)} aria-label="Switch prototype"
      title="Switch to another prototype in this build" style={DEMO_SELECT}>
      <option value="regular">Regular flow</option>
      <option value="checkout-link">Checkout Link demo</option>
    </select>
  );
}

function DemoBar({ view, onJump, onSwitchFlow, variant, onVariantChange, expressStyle, onExpressStyleChange,
  format, onFormatChange, skippedStages = [] }) {
  /* Collapsing hides the controls but never the WIP chip — the marker has to be on
     every screen, and "clean screenshot" can't be allowed to mean "screenshot with
     no sign it's unapproved". On `main` there's no chip, so all that's left is the
     restore button. */
  const [hidden, setHidden] = useState(false);

  const bar = { background:"#f0f0f0", borderBottom:"1px solid #e0e0e0", padding:"6px 12px",
    display:"flex", alignItems:"center", flexWrap:"wrap", gap:12, fontSize:13, color:T.textSubtle };

  if (hidden) return (
    <div style={{ ...bar, justifyContent: IS_WIP ? "space-between" : "flex-end", padding:"4px 12px" }}>
      <WipChip />
      <button onClick={() => setHidden(false)} aria-label="Show demo controls" title="Show demo controls"
        style={demoIconBtn(false)}>
        <Ms name="visibility" size={16} color={T.textSubtle} />
      </button>
    </div>
  );

  return (
    <div style={{ ...bar, justifyContent:"space-between" }}>
      {/* Shrinkable, unlike the two zones beside it: the chip is the only item on the
          bar long enough to overflow a phone, and it's the one that can afford to
          wrap. The stepper and the icon buttons hold their size instead. */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", minWidth:0 }}>
        <WipChip />
        <FlowSwitcher onSwitchFlow={onSwitchFlow} />
      </div>
      <StageStepper view={view} onJump={onJump} skippedStages={skippedStages} />
      <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
        <DemoSettings variant={variant} onVariantChange={onVariantChange}
          format={format} onFormatChange={onFormatChange}
          expressStyle={expressStyle} onExpressStyleChange={onExpressStyleChange} />
        <button onClick={() => setHidden(true)} aria-label="Hide demo controls"
          title="Hide demo controls — for screenshots" style={demoIconBtn(false)}>
          <Ms name="visibility_off" size={16} color={T.textSubtle} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ ROOT ═══════════════════════════ */
/* ?stage=<pdp|checkout|confirm|email> opens the fork on that screen.

   The seller-side link setup page and the hosted PDP live in a different
   prototype, so a demo of the whole journey has to cross from there into this
   one. Without a parameter that crossing is "now click the demo nav", which is
   the one moment of a demo where the audience watches the scaffolding instead of
   the product. The stage keys are the stepper's own, so the URL and the demo bar
   can't disagree about what the stages are.

   Unrecognised values fall back to the PDP rather than throwing: a mistyped demo
   URL should still open on something. Like the regular flow's params this seeds
   the first render only — using the stepper afterwards doesn't rewrite the URL. */
const STAGE_KEYS = STAGES.map(s => s.key);
const initialStage = () => {
  if (typeof window === "undefined") return "pdp";
  const s = (new URLSearchParams(window.location.search).get("stage") || "").trim().toLowerCase();
  return STAGE_KEYS.includes(s) ? s : "pdp";
};

/* Stands in for the seller-side link setup page, which is owned elsewhere and
   isn't part of this package (see README §2). It's here only so the demo
   stepper can show the whole journey — a shopper's first stop is a link the
   seller already generated, not this screen. */
function LinkSetupPlaceholder({ onContinue }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:FONT_SANS }}>
      <div style={{ maxWidth:440, width:"100%", background:T.surface, border:`1px solid ${T.borderSubtle}`,
        borderRadius:T.radius, padding:32, textAlign:"center" }}>
        <Ms name="link" size={28} color={T.brand} />
        <h1 style={{ fontFamily:FONT_HEADING, fontSize:20, fontWeight:600, color:T.textBold, margin:"12px 0 8px" }}>
          Link setup
        </h1>
        <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5, margin:"0 0 20px" }}>
          The seller builds their Checkout Link here — picks the book, what format it sells,
          and copies the shareable link. That page is owned elsewhere and isn't part of this
          prototype; this stop just marks where it sits in the journey.
        </p>
        <Btn onClick={onContinue}>Continue to product page</Btn>
      </div>
    </div>
  );
}

function CheckoutLinkApp({ onSwitchFlow }) {
  const [view, setView] = useState(initialStage);  // pdp | checkout | confirm | email
  const [cartOpen, setCartOpen] = useState(false);
  const [inCart, setInCart] = useState(false);

  /* What the seller put on the link (print | digital | both) and what the buyer
     ended up with. Single-format links pin `format` to the only choice. */
  const [variant, setVariant] = useState("print");
  const [format, setFormat]   = useState(defaultFormat("print"));

  // Shared order state, threaded through every screen
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState("");
  const [appliedCode, setAppliedCode] = useState(null);
  const [shippingAddr, setShippingAddr] = useState(null);
  const [shippingMethod, setShippingMethod] = useState(null);
  const [shippingCost, setShippingCost] = useState(null);
  const [billingAddr, setBillingAddr] = useState(EMPTY_ADDRESS);
  const [paymentDone, setPaymentDone] = useState(false);
  const [pdpExpress, setPdpExpress] = useState(null);   // open wallet sheet on the PDP
  /* True once the order was paid straight from the PDP or cart, so the checkout
     stage was never visited. Drives the greyed-out stage chip. */
  const [checkoutSkipped, setCheckoutSkipped] = useState(false);
  /* Which express treatment to show — switchable from the demo banner so the
     options can be compared rather than argued about. */
  const [expressStyle, setExpressStyle] = useState("single");

  const order = {
    variant, format, setFormat,
    qty, setQty, email, setEmail, appliedCode, setAppliedCode,
    shippingAddr, setShippingAddr, shippingMethod, setShippingMethod,
    shippingCost, setShippingCost, billingAddr, setBillingAddr,
    paymentDone, setPaymentDone,
  };

  /* Switching the link variant restarts the demo — a different link is a
     different product on sale, so carrying cart/order state across would lie. */
  const switchVariant = v => {
    setVariant(v); setFormat(defaultFormat(v));
    setView("pdp"); setCartOpen(false); setInCart(false);
    setQty(1); setEmail(""); setAppliedCode(null);
    setShippingAddr(null); setShippingMethod(null); setShippingCost(null);
    setBillingAddr(EMPTY_ADDRESS); setPaymentDone(false); setPdpExpress(null);
    setCheckoutSkipped(false);
  };

  /* Inject Blurb's brand @font-face rules only while the fork is mounted, so
     the original checkout never uses or downloads them. */
  useEffect(() => {
    const ID = "blurb-checkout-link-fonts";
    if (document.getElementById(ID)) return;
    const style = document.createElement("style");
    style.id = ID;
    style.textContent = BLURB_FONT_FACES;
    document.head.appendChild(style);
  }, []);

  const addToCart = q => { setQty(q); setInCart(true); setCartOpen(true); };
  const goCheckout = () => { setCartOpen(false); setCheckoutSkipped(false); setView("checkout"); };

  /* Express buy from either the PDP or the cart drawer: skip whatever is left of
     the funnel. The wallet sheet is the review step, so authorizing goes straight
     to confirmation. Closes the drawer so the sheet isn't stacked on top of it. */
  const expressBuy = (q, wallet) => { setQty(q); setInCart(true); setCartOpen(false); setPdpExpress(wallet); };


  /* A placed order always has shipping + address (even via express checkout,
     which skips those steps in the prototype), so the confirmation/email/
     email never fall back to "Select shipping method" placeholders. */
  const DEMO_ADDR = { firstName:"Alex", lastName:"Reader", company:"", phone:"+1 415-555-0175",
    country:"United States", address:"580 California St", address2:"", city:"San Francisco", state:"CA", zip:"94104" };
  /* Takes the format explicitly so it can be called with a value that hasn't landed
     in state yet — switching "Ordered" from the demo bar needs exactly that. */
  const backfillOrder = (fmt = format) => {
    if (!inCart) setInCart(true);
    if (!email) setEmail(DEMO_BUYER_EMAIL);
    if (!billingAddr.country) setBillingAddr(DEMO_ADDR);
    /* A digital-only order has no shipment at all, so leave shipping empty —
       the post-order screens branch on it. */
    if (!hasPrint(fmt)) return;
    if (!shippingAddr) setShippingAddr(DEMO_ADDR);
    if (!shippingMethod) { setShippingMethod("economy"); setShippingCost(9.99); }
  };

  /* Switching what was ordered from the demo bar. On a post-order stage the new
     format may need shipping data the old one didn't, so backfill for it. */
  const POST_ORDER = ["confirm", "email"];
  const changeFormat = f => {
    setFormat(f);
    if (POST_ORDER.includes(view)) backfillOrder(f);
  };
  const placeOrder = () => { backfillOrder(); setView("confirm"); };

  /* A stage opened straight from the URL has none of the state the screens before
     it would have set, so it needs the same backfill a demo-bar jump gets — or the
     confirmation reports an order of nothing. Runs once: this is the landing
     stage, not every change of stage. Checkout only needs the cart to be full,
     since it collects the rest itself. */
  useEffect(() => {
    const landing = view;
    if (POST_ORDER.includes(landing)) backfillOrder();
    else if (landing === "checkout") setInCart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The wallet supplies email, address and the shipping method the buyer picked in
     the sheet, so this commits them explicitly rather than relying on backfill. */
  const placeOrderExpress = shipId => {
    if (!inCart) setInCart(true);
    if (!email) setEmail(DEMO_BUYER_EMAIL);
    if (!billingAddr.country) setBillingAddr(DEMO_ADDR);
    if (hasPrint(format)) {
      setShippingAddr(DEMO_ADDR);
      const opt = SHIPPING_OPTS.find(o => o.id === shipId) || SHIPPING_OPTS[0];
      setShippingMethod(opt.id); setShippingCost(opt.price);
    }
    setPdpExpress(null);
    setCheckoutSkipped(true);
    setView("confirm");
  };

  /* Jump straight to a stage from the demo bar — backfill order data for any
     post-order screen so it doesn't render blank when skipped into. */
  const jump = key => {
    if (POST_ORDER.includes(key)) backfillOrder();
    /* Back to the product page is a fresh run, so the checkout stage is reachable
       again — otherwise one express purchase would lock the chip out for good. */
    if (key === "pdp") { setCartOpen(false); setCheckoutSkipped(false); }
    setView(key);
  };

  return (
    <div style={{ fontFamily: FONT_SANS }}>
      <DemoBar view={view} onJump={jump} onSwitchFlow={onSwitchFlow} variant={variant} onVariantChange={switchVariant}
        expressStyle={expressStyle} onExpressStyleChange={setExpressStyle}
        format={format} onFormatChange={changeFormat}
        skippedStages={checkoutSkipped ? ["checkout"] : []} />

      {view === "setup" && (
        <LinkSetupPlaceholder onContinue={() => jump("pdp")} />
      )}

      {view === "pdp" && (
        <>
          <ProductPage variant={variant} format={format} setFormat={setFormat}
            cartCount={inCart ? (hasPrint(format) ? qty : 0) + (hasDigital(format) ? 1 : 0) : 0}
            expressStyle={expressStyle}
            onAddToCart={addToCart} onExpressBuy={expressBuy}
            onCartClick={() => setCartOpen(true)} onCheckout={goCheckout} />
          <CartDrawer open={cartOpen} empty={!inCart} qty={qty} setQty={setQty}
            variant={variant} format={format} setFormat={setFormat} onExpressBuy={expressBuy}
            expressStyle={expressStyle}
            onClose={() => setCartOpen(false)} onRemove={() => setInCart(false)} onCheckout={goCheckout} />
          {/* Wallet sheet for express buy — itemised, so nothing is authorized unseen */}
          <ExpressModal method={pdpExpress} format={format} qty={hasPrint(format) ? qty : 1}
            onClose={() => setPdpExpress(null)} onConfirm={placeOrderExpress} />
        </>
      )}

      {view === "checkout" && (
        <CheckoutView order={order} onPlaceOrder={placeOrder} onBackToCart={() => { setView("pdp"); setCartOpen(true); }} />
      )}

      {view === "confirm" && (
        <OrderConfirmation order={order} />
      )}

      {view === "email" && (
        <ConfirmationEmail order={order} onBack={() => setView("confirm")} />
      )}
    </div>
  );
}

export default CheckoutLinkApp;
