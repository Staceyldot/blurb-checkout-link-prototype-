import React, { useState, useEffect, useRef } from "react";
import CheckoutLinkApp from "./CheckoutLinkApp.jsx";


/* ── Design tokens ── */
const T = {
  bg: "#f6f6f6", surface: "#ffffff", surfaceSunken: "#dcdcdc", disabled: "#dcdcdc",
  border: "#989898", textBold: "#292929", textSubtle: "#464646",
  textDisabled: "#656565", textLink: "#107eb1", textError: "#bd1818", brand: "#107eb1",
  success: "#166640", errorBg: "#fdf3f3", successBg: "#f0f7f0",
  /* Light blue informational panel — used by the Add to Cart / Cart notices */
  panelBg: "#f0f7fb",
  shadow: "0 2px 2px rgba(51,51,51,0.12)", radius: "4px",
};

const COUNTRIES = [
  "United States","Canada","United Kingdom","Australia","Germany","France",
  "Spain","Italy","Netherlands","Belgium","Japan","Brazil","Mexico","India","Other"
];

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const CA_PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const AU_STATES = ["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"];

/* Address fields required per country — drives the State/Province + postal labels & demo data */
const COUNTRY_FIELDS = {
  "United States":  { stateLabel:"State",            stateOptions:US_STATES,    stateRequired:true,  zipLabel:"Zip code",    demo:{ address:"580 California St", city:"San Francisco", state:"CA", zip:"94104" } },
  "Canada":         { stateLabel:"Province",         stateOptions:CA_PROVINCES, stateRequired:true,  zipLabel:"Postal code", demo:{ address:"290 Bremner Blvd",  city:"Toronto",       state:"ON", zip:"M5V 3L9" } },
  "Australia":      { stateLabel:"State / Territory", stateOptions:AU_STATES,    stateRequired:true,  zipLabel:"Postcode",    demo:{ address:"1 Macquarie St",    city:"Sydney",        state:"NSW", zip:"2000" } },
  "United Kingdom": { stateLabel:"County",           stateOptions:null,         stateRequired:false, zipLabel:"Postcode",    demo:{ address:"10 Downing St",     city:"London",        state:"Greater London", zip:"SW1A 2AA" } },
};
const DEFAULT_COUNTRY_FIELDS = { stateLabel:"State / Province / Region", stateOptions:null, stateRequired:false, zipLabel:"Postal code", demo:{ address:"123 Main Street", city:"Capital City", state:"", zip:"00000" } };

/* What the demo nav supplies when it jumps past the checkout to the confirmation —
   the same values the form's own click-to-fill uses, so the two agree. */
const DEMO_ORDER_EMAIL = "jane.doe@blurb.com";
const DEMO_ORDER_ADDR = { firstName:"Jane", lastName:"Doe", company:"Blurb Inc.",
  phone:"+1 415-555-0123", country:"United States", ...COUNTRY_FIELDS["United States"].demo };

/* ── Figma assets ── */
const BLURB_LOGO  = "/assets/blurb-logo.png";
const APPLE_PAY   = "/assets/apple-pay.svg";
const PAYPAL_IMG  = "/assets/paypal.svg";
const GPAY        = "/assets/google-pay.svg";
/* Dark-ground artwork. Apple's mark is the same shape in white; Google's keeps the
   four-colour G and turns only the wordmark white, which is their prescribed
   dark-theme treatment. The light marks above disappear on black. */
const APPLE_PAY_W = "/assets/apple-pay-white.svg";
const GPAY_W      = "/assets/google-pay-white.svg";
/* PayPal's reversed mark: the same paths as paypal.svg with the fills set to
   solid white, which is the variant PayPal supplies for dark grounds. No path is
   touched, so the proportions are the supplied ones. */
const PAYPAL_W    = "/assets/paypal-white.svg";
const PRODUCT_IMG = "/assets/product-photobook.png";
/* Stock shot of the materials themselves, from the wireframe's own asset
   (12442:88322) — the options section is about paper, endsheet and cover, so it
   shows what those feel like rather than repeating the project's cover. Square,
   because it's a preset photo and not this buyer's artwork. */
const PRODUCT_MATERIAL_IMG = "/assets/product-material.png";
/* Exported from Figma 12442:88339 at 3× (234²) — the card renders it at 78px, and
   the 1× export was a 78px bitmap that softened on a retina screen. */
const GIFT_BOX_IMG = "/assets/gift-box.png";
/* The full product shot (Figma 12900:51211) — box and book on a plain ground,
   landscape. The card's square crop of GIFT_BOX_IMG is fine at 78px but loses
   the box at preview size, so the modal uses this instead. */
const GIFT_BOX_PREVIEW_IMG = "/assets/gift-box-preview.png";
const VISA        = "/assets/visa.svg";
const MASTERCARD  = "/assets/mastercard.svg";
const AMEX        = "/assets/amex.svg";
const DISCOVER    = "/assets/discover.svg";

/* ── Social brand glyphs (inline, full-color) ── */
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

/* ── Icons ── */
function IconExpandMore({ color, size=24 }) {
  return <span className="ms" style={{ fontSize:size, color:color||T.textBold, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>expand_more</span>;
}
function IconExpandLess({ color, size=24 }) {
  return <span className="ms" style={{ fontSize:size, color:color||T.textBold, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>expand_less</span>;
}
function IconCheckCircle({ size=24 }) {
  // Outlined green check-circle (Figma 10978:39664), not a filled disc
  return <span className="ms" style={{ fontSize:size, color:T.success, lineHeight:1, flexShrink:0,
    fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>;
}
function IconLock({ size=16, color=T.textSubtle }) {
  return <span className="ms" style={{ fontSize:size, color, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>lock</span>;
}
function IconInfo({ size=16 }) {
  return <span className="ms" style={{ fontSize:size, color:T.textSubtle, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>info</span>;
}
function IconCart({ size=20, color=T.brand }) {
  return <span className="ms" style={{ fontSize:size, color, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>shopping_cart</span>;
}
function IconVisibility({ size=20, on=true }) {
  return <span className="ms" style={{ fontSize:size, color:T.textSubtle, fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>{on ? "visibility" : "visibility_off"}</span>;
}

/* ── Primitives ── */
function Divider() {
  return <div style={{ height:1, background:"#e0e0e0", width:"100%", flexShrink:0 }} />;
}

function Input({ label, placeholder, hint, error, required, type="text", value, onChange, rightIcon, onClick, onBlur }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && (
        <label style={{ fontSize:15, fontWeight:600, color:T.textBold }}>
          {label}{required && <span style={{color:T.textError}}> *</span>}
        </label>
      )}
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value||""}
          onChange={e => onChange && onChange(e.target.value)}
          onClick={onClick}
          /* Validating on blur is what makes a field's own message reachable before
             the form is submitted — see the guest shipping form, where the only
             feedback used to be a dead Continue button. */
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          style={{
            border:`1px solid ${error ? T.textError : T.border}`,
            borderRadius:T.radius, padding:"9px 11px",
            paddingRight: rightIcon ? 38 : 11,
            fontSize:15, color:T.textBold, background:T.surface, width:"100%",
          }}
        />
        {rightIcon && (
          <div style={{ position:"absolute", right:10, display:"flex", alignItems:"center" }}>
            {rightIcon}
          </div>
        )}
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
          {label}{required && <span style={{color:T.textError}}> *</span>}
        </label>
      )}
      <div style={{ position:"relative" }}>
        <select
          value={value||""}
          onChange={e => onChange && onChange(e.target.value)}
          style={{
            border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"9px 11px",
            paddingRight:44, /* room for the custom chevron below */
            fontSize:15, color:value ? T.textBold : "#888", background:T.surface,
            width:"100%", appearance:"none",
          }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {/* Custom chevron, inset to match Combobox instead of the browser's flush-right arrow */}
        <span className="ms" style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", color:T.textBold, fontSize:22 }}>expand_more</span>
      </div>
    </div>
  );
}

/* ── Searchable dropdown (type to find) ── */
function Combobox({ label, required, value, onChange, options, placeholder="Start typing to search…", error }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
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
          {label}{required && <span style={{color:T.textError}}> *</span>}
        </label>
      )}
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <input
          value={open ? query : (value || "")}
          placeholder={value || placeholder}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          style={{
            border:`1px solid ${error ? T.textError : T.border}`,
            borderRadius:T.radius, padding:"9px 11px", paddingRight:44,
            fontSize:15, color:T.textBold, background:T.surface, width:"100%",
          }}
        />
        <span className="ms" style={{ position:"absolute", right:14, pointerEvents:"none", color:T.textBold, fontSize:22 }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </div>
      {open && (
        <div style={{
          border:`1px solid ${T.border}`, borderRadius:T.radius, marginTop:2,
          maxHeight:200, overflowY:"auto", background:T.surface,
          boxShadow:"0 4px 12px rgba(0,0,0,.08)",
        }}>
          {filtered.length === 0 && (
            <div style={{ padding:"9px 11px", fontSize:14, color:T.textSubtle }}>No matches</div>
          )}
          {filtered.map(o => (
            <div key={o}
              onMouseDown={() => choose(o)}
              style={{ padding:"9px 11px", fontSize:15, color:T.textBold, cursor:"pointer",
                background: o === value ? "#f0f7fb" : T.surface }}
              onMouseEnter={e => e.currentTarget.style.background = o === value ? "#f0f7fb" : "#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background = o === value ? "#f0f7fb" : T.surface}
            >
              {o}
            </div>
          ))}
        </div>
      )}
      {error && <p style={{ fontSize:13, color:T.textError }}>{error}</p>}
    </div>
  );
}

/* `disabled` greys the button and drops its click handler, but deliberately does NOT
   set the native `disabled` attribute — a natively disabled button isn't focusable, so
   a keyboard or screen-reader user tabbing the page never lands on it and never hears
   why it won't work. `aria-disabled` announces the state while keeping it reachable,
   and `describedBy` points at the sentence that gives the reason. */
function Btn({ children, onClick, variant="primary", disabled, fullWidth, describedBy }) {
  const base = {
    borderRadius:T.radius, fontSize:15, fontWeight:600,
    cursor:disabled ? "not-allowed" : "pointer",
    width:fullWidth ? "100%" : undefined,
    padding:"10px 24px", transition:"opacity .15s", border:"none",
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
  };
  const variants = {
    primary:   { background:T.brand, color:"#fff" },
    secondary: { background:"transparent", color:T.brand, border:`1px solid ${T.brand}` },
    disabled:  { background:T.disabled, color:T.textDisabled },
  };
  const s = disabled ? variants.disabled : variants[variant];
  return (
    <button
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled ? true : undefined}
      aria-describedby={describedBy}
      style={{...base, ...s}}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity=".82"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity="1"; }}
    >
      {children}
    </button>
  );
}

function Alert({ type="error", message }) {
  const c = {
    error:   { bg:T.errorBg,   border:T.textError, color:T.textError },
    success: { bg:T.successBg, border:T.success,   color:T.success   },
    info:    { bg:"#f0f7fb",   border:T.brand,     color:"#0a5a80"   },
  }[type];
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:T.radius, padding:"10px 14px", fontSize:14, color:c.color, lineHeight:1.5 }}>
      {message}
    </div>
  );
}

/* ── Generic Accordion ── */
/* ── Smoothly collapsing wrapper (animates height via grid-rows + fade) ── */
function Collapse({ open, children }) {
  return (
    <div
      aria-hidden={!open}
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: "grid-template-rows .3s ease, opacity .25s ease",
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
    </div>
  );
}

/* ── Animates its own height when the content inside changes size ── */
function AutoHeight({ children }) {
  const ref = useRef(null);
  const [h, setH] = useState(null); // null → "auto" until first measure (avoids opening flash)
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
    <div style={{ height: h == null ? "auto" : h, overflow:"hidden", transition:"height .3s ease" }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* ── Accordion section: header + animated body, with an in-place completed state ── */
function AccordionSection({ title, open, onToggle, disabled, completed, summary, children }) {
  const showSummary  = completed && !open;
  const labelColor   = disabled ? T.textDisabled : T.textBold;
  const chevronColor = disabled ? T.textDisabled : T.textBold;
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, overflow:"hidden" }}>
      <button
        onClick={disabled ? undefined : onToggle}
        style={{
          width:"100%", display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          padding:"16px 24px", background:"none", border:"none", textAlign:"left",
          cursor: disabled ? "default" : "pointer",
        }}
      >
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
          {(open ? <IconExpandLess color={chevronColor} /> : <IconExpandMore color={chevronColor} />)}
        </span>
      </button>
      <Collapse open={open}>
        <div style={{ padding:"0 24px 24px" }}>
          {children}
        </div>
      </Collapse>
    </div>
  );
}

/* ── Responsive: track viewport width → desktop / tablet / mobile ── */
function useViewport() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width, isMobile: width < 768, isTablet: width >= 768 && width < 1024, isDesktop: width >= 1024 };
}

/* ── Promo codes ──
   A code is either a flat dollar amount off, or `allFree` — the whole order zeroed,
   shipping included. ALLFREE demos the free-order case: a $0 total, which is the
   only state in this checkout where no payment is collected at all.

   One table, read in three places (the summary's maths, the shipping prices, and
   whether Payment is asked for), so "is this order free?" has a single answer. */
const PROMO_CODES = {
  BLURB10: { off:10 },
  SAVE20:  { off:20 },
  BULK50:  { off:50 },
  ALLFREE: { allFree:true },
};
const isFreeCode = code => !!(code && PROMO_CODES[code]?.allFree);

/* Announced to screen readers, invisible on screen. Used for the one change on this
   page that happens away from the pointer: a required Payment section appearing or
   disappearing under a promo code. */
const SR_ONLY = { position:"absolute", width:1, height:1, padding:0, margin:-1,
  overflow:"hidden", clip:"rect(0 0 0 0)", whiteSpace:"nowrap", border:0 };

/* ── Order Summary ── */
/* `appliedCode` is owned by the checkout, not by this panel: whether a code is on
   the order decides whether Payment is collected, and on mobile this panel unmounts
   into the bottom tray — state kept locally used to vanish on a resize. */
function OrderSummary({ items = CART_SEED, discountAmt, shippingCost, hasBilling, paymentDone, onPlaceOrder, orderPlaced, onTotalChange, appliedCode = null, onApplyCode, onRemoveCode, digitalOnly = false }) {
  const [productsOpen, setProductsOpen] = useState(true);
  const [discountInput, setDiscountInput]       = useState("");
  const [discountError, setDiscountError]       = useState("");
  /* Everything below is the cart the buyer actually built — the summary used to
     describe a fixed three-item order, which stopped being true the moment the
     Cart could vary. The volume discount is earned rather than assumed: it only
     applies once the printed copies cross the advertised tier. */
  const subtotal  = cartTotal(items);
  const printSub  = items.filter(it => !isPdf(it)).reduce((sum, it) => sum + lineTotal(it), 0);
  const units     = cartUnits(items);
  const VOLUME_DISCOUNT = units >= VOLUME_TIER.minUnits
    ? Math.round(printSub * VOLUME_TIER.percent) / 100
    : 0;
  /* A free-order code takes the whole subtotal off and waives shipping, so its
     "amount" is whatever the cart happens to come to rather than a fixed figure. */
  const allFree   = isFreeCode(appliedCode);
  const codeValue = allFree ? subtotal : (appliedCode ? PROMO_CODES[appliedCode].off : 0);
  // A promo code replaces the volume discount; otherwise the volume discount applies.
  const discountVal = appliedCode ? codeValue : VOLUME_DISCOUNT;
  const savesLess   = appliedCode && !allFree && codeValue < VOLUME_DISCOUNT;
  /* Only the free-order code touches the tax base — leaving it at the subtotal for
     the flat-amount codes keeps their maths exactly as it was. Shipping keeps its
     list price in state and is zeroed here, so removing the code restores the real
     cost instead of losing it. */
  const taxBase   = allFree ? 0 : subtotal;
  const tax       = hasBilling ? Math.round(taxBase * 8) / 100 : null;
  const shipCharged = allFree ? 0 : (shippingCost || 0);
  const total     = Math.max(0, subtotal - discountVal + shipCharged + (tax||0));

  /* Report total upward (used by the mobile bottom tray) */
  useEffect(() => { if (onTotalChange) onTotalChange(total); }, [total, onTotalChange]);

  const applyDiscount = () => {
    const code = discountInput.trim().toUpperCase();
    if (!code)               return setDiscountError("Enter a code.");
    if (!PROMO_CODES[code])  return setDiscountError("This code isn't valid or has expired.");
    setDiscountError(""); setDiscountInput(""); onApplyCode?.(code);
  };

  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Order summary</span>
        <span style={{ fontSize:14, color:T.textBold }}>Prices in USD</span>
      </div>

      {/* Line items */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <SRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />

        {/* Discount / promo — "Volume discount" when auto-applied, else "Promo code" (Figma 10978:34590) */}
        {appliedCode ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:16, fontWeight:600, lineHeight:"24px" }}>
              <span style={{ display:"flex", alignItems:"center", gap:6, color:T.success }}>
                {appliedCode} – Code applied
                {!orderPlaced && (
                  <button onClick={() => { onRemoveCode?.(); setDiscountError(""); }} aria-label="Remove code"
                    style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:0 }}>
                    <span className="ms" style={{ fontSize:16, color:T.textSubtle }}>close</span>
                  </button>
                )}
              </span>
              <span style={{ color:T.success }}>-${codeValue.toFixed(2)}</span>
            </div>
            {!orderPlaced && (savesLess
              ? <div style={{ display:"flex", alignItems:"flex-start", gap:6, background:"#f0f7fb", color:"#0a5a80", borderRadius:T.radius, padding:"8px 10px", fontSize:13, lineHeight:1.4 }}>
                  <span className="ms" style={{ fontSize:16, color:T.brand }}>info</span> This code saves less than your volume discount.
                </div>
              : <div style={{ display:"flex", alignItems:"center", gap:6, background:T.successBg, color:T.success, borderRadius:T.radius, padding:"8px 10px", fontSize:13 }}>
                  <span className="ms" style={{ fontSize:16, color:T.success }}>check_circle</span>
                  {/* The shipping half is only worth saying when there was a shipping
                      charge to waive. On a digital order there never was one, and
                      claiming it as a saving describes something that didn't happen. */}
                  {allFree && !digitalOnly ? "Code applied. Shipping is free too." : "Code applied"}
                </div>)}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {/* Only when one was actually earned — "-$0.00" reads as a discount
                that failed rather than one the order hasn't qualified for. */}
            {VOLUME_DISCOUNT > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>Volume discount</span>
                <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.success }}>-${VOLUME_DISCOUNT.toFixed(2)}</span>
              </div>
            )}
            {!orderPlaced && (
              <>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={discountInput}
                    onChange={e => { setDiscountInput(e.target.value); if (discountError) setDiscountError(""); }}
                    onKeyDown={e => e.key==="Enter" && applyDiscount()}
                    placeholder="Enter code"
                    style={{ flex:1, border:`1px solid ${discountError ? T.textError : T.border}`, borderRadius:T.radius, padding:"7px 10px", fontSize:14 }}
                  />
                  <Btn variant="secondary" onClick={applyDiscount}>Apply</Btn>
                </div>
                {discountError && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:T.errorBg, color:T.textError, borderRadius:T.radius, padding:"8px 10px", fontSize:13 }}>
                    <span className="ms" style={{ fontSize:16, color:T.textError }}>info</span> {discountError}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <SRow
          label={<span style={{display:"flex",alignItems:"center",gap:3}}>Shipping <IconInfo size={14}/></span>}
          /* Three answers, in order of how settled they are. A digital-only order is
             $0.00 outright — not "Free", which implies a waived charge, and not a
             prompt, because there is no method to choose. Then the free-order code,
             which does waive a real charge, so the list price stays visible struck
             through rather than the saving being silent. Then the ordinary case. */
          value={digitalOnly
            ? "$0.00"
            : allFree
              ? <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {shippingCost != null && (
                    <span style={{ color:T.textSubtle, textDecoration:"line-through" }}>${shippingCost.toFixed(2)}</span>
                  )}
                  <span style={{ color:T.success }}>Free</span>
                </span>
              : shippingCost
                ? `$${shippingCost.toFixed(2)}`
                : <span style={{color:T.textSubtle}}>Select shipping method</span>
          }
        />
        <SRow
          label={<span style={{display:"flex",alignItems:"center",gap:3}}>Tax <IconInfo size={14}/></span>}
          /* Checked against null, not truthiness — a genuine $0.00 of tax on a free
             order is an answer, and the old check showed it as a question. */
          value={tax != null
            ? `$${tax.toFixed(2)}`
            : <span style={{color:T.textSubtle}}>Enter billing address</span>
          }
        />
        <Divider />
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:18, fontWeight:600, lineHeight:"28px", color:T.textBold }}>Total</span>
          <span style={{ fontSize:18, fontWeight:600, lineHeight:"28px", color:T.textBold }}>${total.toFixed(2)}</span>
        </div>
        {/* Said next to the number it's about. The Payment step is gone by this point,
            so the summary is where "nothing to pay" has to be answerable. */}
        {total === 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:T.success }}>
            <span className="ms" style={{ fontSize:16 }}>check_circle</span> No payment required
          </div>
        )}
      </div>

      {/* Legal + Place order — hidden once order is placed */}
      {!orderPlaced && (
        <>
          <p style={{ fontSize:11, color:T.textSubtle, lineHeight:1.6 }}>
            By clicking the "Place order" button you confirm your agreement with{" "}
            <a href="#" style={{color:T.textLink}}>Blurb's Terms</a>,{" "}
            <a href="#" style={{color:T.textLink}}>Conditions</a>, and{" "}
            <a href="#" style={{color:T.textLink}}>Return policy</a>. You can change or cancel an order
            within three hours of placing it. PDFs are non-refundable and can't be canceled.
          </p>
          {/* A disabled primary CTA with no reason is a dead end, so the button says why.

              One line for every case, rather than naming the specific outstanding step.
              The question someone asks of a greyed CTA is "is this broken?", not "which
              step is next?" — the accordion beside it already shows which sections have
              no tick, so naming the step answers a question the page has answered and
              costs four strings in every locale to do it. This also can't go wrong: a
              line that names the wrong step is worse than one that names none.

              No spatial word in it, deliberately. This panel is a right-hand column on
              desktop and a bottom tray on mobile, so the steps are beside it in one
              layout and above it in the other — "the steps above" is simply false at
              desktop width. "The form" is wrong too: there are four sections, not one.

              It's a permanent sibling of the button, not a tooltip or a title attribute —
              both are unreachable by keyboard and invisible on touch. `describedBy` ties
              them together so a screen reader announces "Place order, unavailable,
              complete the steps above to place your order" as one utterance.

              No line on a $0 order: `paymentDone` arrives here already OR'd with the
              free-order case, so the button is live and there is nothing to explain. */}
          <Btn onClick={paymentDone ? onPlaceOrder : undefined} disabled={!paymentDone} fullWidth
            describedBy={paymentDone ? undefined : "place-order-reason"}>
            Place order
          </Btn>
          {!paymentDone && (
            <p id="place-order-reason" style={{ fontSize:13, color:T.textSubtle, textAlign:"center" }}>
              Complete all the steps to place your order
            </p>
          )}
        </>
      )}

      <Divider />

      {/* Products accordion */}
      <button
        onClick={() => setProductsOpen(o => !o)}
        style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", padding:"4px 0" }}
      >
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Products</span>
        {productsOpen ? <IconExpandLess /> : <IconExpandMore />}
      </button>
      <Collapse open={productsOpen}>
        {/* paddingTop gives the first item's qty badge (top:-6) room so it isn't clipped by Collapse's overflow:hidden */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, paddingTop:8 }}>
          {items.map(it => isPdf(it) ? (
            <ProductItem key={it.id} qty={1} img={it.img} name="PDF"
              desc="Instant download" pages={`${it.size} · ${it.options}`} price={`$${PDF_PRICE.toFixed(2)}`} />
          ) : (
            <ProductItem key={it.id} qty={it.qty} img={it.img}
              name={`${it.type} (${it.binding})`} desc={it.options} pages={`${it.pages} pages`}
              each={it.qty > 1 ? `$${UNIT_PRICE.toFixed(2)}/each` : undefined}
              extra={it.gift ? `Gift box +$${GIFT_PRICE.toFixed(2)}` : undefined}
              price={`$${lineTotal(it).toFixed(2)}`} />
          ))}
        </div>
      </Collapse>
    </div>
  );
}

function SRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>{label}</span>
      <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>{value}</span>
    </div>
  );
}

function ProductItem({ qty, name, desc, pages, price, each, extra, img }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
      <div style={{ position:"relative", flexShrink:0 }}>
        <img src={img || PRODUCT_IMG} alt="" style={{ width:76, height:"auto", borderRadius:3, display:"block" }}
          onError={e => { e.target.style.background="#ddd"; e.target.removeAttribute("src"); }} />
        <span style={{ position:"absolute", top:-6, right:-6, background:T.surfaceSunken, borderRadius:12, padding:"2px 7px", fontSize:11, fontWeight:600, color:T.textBold }}>{qty}</span>
      </div>
      <div style={{ fontSize:13, color:T.textBold, lineHeight:1.65 }}>
        <div style={{ fontWeight:700 }}>{name}</div>
        <div style={{ color:T.textSubtle }}>{desc}</div>
        {pages && <div style={{ color:T.textSubtle }}>{pages}</div>}
        {each  && <div style={{ color:T.textSubtle }}>{each}</div>}
        {extra && <div style={{ color:T.textSubtle }}>{extra}</div>}
        <div style={{ fontWeight:700 }}>{price}</div>
      </div>
    </div>
  );
}

/* ── Express Checkout ── */
/* ── Wallet marks ──────────────────────────────────────────────────────────────
   Each brand's rule about its own mark is the same in substance: use the supplied
   artwork, don't redraw it, don't alter its proportions, and keep clear space
   around it. Sizing by an explicit width breaks the first rule the moment the
   width doesn't match the artwork's aspect ratio — which is what was happening:
   PayPal was drawn at 90×30 against its natural 112.7×30, a 20% horizontal squash
   of the wordmark, and in CheckoutLinkApp the fixed-width boxes left PayPal
   rendering a quarter shorter than Apple's and Google's.

   So the mark is given a height and both dimensions are left to `auto` under
   max-height / max-width caps. The browser then preserves the intrinsic ratio, all
   three marks share an optical size, and on a narrow screen they scale down
   together instead of one of them deforming.

   `WALLET_CLEAR` is the internal clear space. Google asks for at least 8dp around
   the payment button and half the cap-height of its G around the mark; 8px on
   every side satisfies both and is the tightest any of the three should ever be.
   `WALLET_GAP` keeps that 8px between adjacent buttons too.

   Verified guidance: Google Pay brand guidelines (8dp clear space; don't alter
   font, colour, radius or padding; don't make the Google Pay mark smaller than
   other brand identities) and the PayPal SDK style reference (gold recommended).
   Apple's HIG pages are script-rendered and could not be read directly — the
   treatment here uses Apple's documented white-with-outline and black styles and
   their supplied artwork, which is the conservative reading. */
const WALLET_CLEAR = 8;
const WALLET_GAP   = 10;

/* 40px to match the Codex Button, which every other button on the page uses.
   That fixes the mark at 24px: 40 less WALLET_CLEAR top and bottom is exactly
   what's left, and Google's 8dp is the floor rather than a target. 40px is also
   Google Pay's own minimum button height, so the row sits right on both rules.
   Raising the button without raising the mark is the tempting mistake — it eats
   the clear space, which is the one thing all three brands ask for. */
const WALLET_BTN_H = 40;
const WALLET_MARK  = WALLET_BTN_H - WALLET_CLEAR * 2;

/* Order follows the wireframe row. All three on black, matching the checkout
   wireframes, which are the reference for this row: PayPal was on its
   recommended gold here while Figma had it on black, and one row reading as two
   treatments is worse than either choice. Black takes PayPal's reversed mark —
   the colour one disappears against it. */
const WALLET_BUTTONS = [
  { id:"Apple Pay",  img:APPLE_PAY_W, bg:"#000000" },
  { id:"PayPal",     img:PAYPAL_W,    bg:"#000000" },
  { id:"Google Pay", img:GPAY_W,      bg:"#000000" },
];

function WalletMark({ src, height }) {
  return (
    <img src={src} alt="" aria-hidden="true"
      style={{ display:"block", width:"auto", height:"auto", maxHeight:height, maxWidth:"100%" }} />
  );
}

function ExpressCheckout({ onExpressSelect, open, onToggle }) {
  /* Three-up on desktop, stacked on mobile. Side by side at 375px each button is
     ~89px wide, which leaves 73px for the mark: Google's fits at full height but
     PayPal's 3.76:1 wordmark has to scale to 19px, so the row ends up showing the
     three brands at visibly different sizes — the thing Google's guidelines
     explicitly forbid for its own mark. Stacked, every mark renders at full height,
     and it matches the DS's full-width stacked Buttons pattern (7850:31720). */
  const { isMobile } = useViewport();
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow }}>
      <button
        onClick={onToggle}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", background:"none", border:"none", cursor:"pointer" }}
      >
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Express checkout</span>
        {open ? <IconExpandLess /> : <IconExpandMore />}
      </button>
      <Collapse open={open}>
        <div style={{ padding:"0 24px 24px", display:"flex", gap: isMobile ? 16 : WALLET_GAP,
          flexDirection: isMobile ? "column" : "row" }}>
          {WALLET_BUTTONS.map(({ id, img, bg }) => (
            /* Each brand's own ground: Apple black, Google black (their dark style),
               PayPal on its recommended gold. Matches CheckoutLinkApp, which already
               used these — the two files had drifted, with this row on
               white-with-outline instead.

               The button is labelled rather than the mark, so the mark is decorative;
               otherwise a screen reader reads the brand twice and never says what the
               button does. */
            <button key={id} onClick={() => onExpressSelect(id)} aria-label={`Pay with ${id}`}
              /* `flex:1` divides the main axis — in a column that's the height, which
                 collapsed the buttons to their content. Stacked, they take full width
                 and keep their own height instead. */
              style={{ flex: isMobile ? "0 0 auto" : 1, width: isMobile ? "100%" : undefined,
                minWidth:0, height:WALLET_BTN_H, padding:`0 ${WALLET_CLEAR}px`,
                border:"none", borderRadius:T.radius, background:bg,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity=".85"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
            >
              <WalletMark src={img} height={WALLET_MARK} />
            </button>
          ))}
        </div>
      </Collapse>
    </div>
  );
}

/* ── Express buy on the cart ───────────────────────────────────────────────────
   Ported from CheckoutLinkApp's PDP/cart drawer so the regular cart offers the
   same thing: pay from the cart without entering the checkout at all. The
   checkout's own express row above is a different job — it's one of the ways to
   start the checkout; this one is the way to skip it.

   Kept in step with useWallets / WALLET_STYLE / WalletButton / ExpressBuySection
   in CheckoutLinkApp.jsx, which are the originals. */

/* Availability is additive, not a device split: Google Pay's JS API works in
   Safari and PayPal has no gating at all, so an iPhone genuinely offers all
   three. Only Apple Pay is truly gated. Order is by likely completion — the
   platform-native wallet leads, then the other device wallet, then PayPal.
   Production reads ApplePaySession.canMakePayments() and the Payment Request
   API; UA sniffing stands in here. Returns [] on first paint so the wrong brand
   never flashes. */
function useWallets() {
  const [wallets, setWallets] = useState([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const applePlatform = /Mac|iPhone|iPad|iPod/i.test(ua);
    const available = [];
    if (window.ApplePaySession || applePlatform) available.push("Apple Pay");
    available.push("Google Pay");
    available.push("PayPal");
    const rank = w => w === "PayPal" ? 2
      : (applePlatform ? (w === "Apple Pay" ? 0 : 1) : (w === "Google Pay" ? 0 : 1));
    setWallets([...available].sort((a, b) => rank(a) - rank(b)));
  }, []);
  return wallets;
}

/* Same grounds as WALLET_BUTTONS above — all three on black. Keyed by wallet
   name because useWallets returns names, not the row's fixed order. */
const WALLET_STYLE = {
  "Apple Pay":  { img:APPLE_PAY_W, bg:"#000000", fg:"#ffffff" },
  "Google Pay": { img:GPAY_W,      bg:"#000000", fg:"#ffffff" },
  "PayPal":     { img:PAYPAL_W,    bg:"#000000", fg:"#ffffff" },
};

/* `hidden` is a wallet that exists but hasn't been revealed yet. It stays mounted
   so the reveal can be animated: growing from zero width beats appearing, and a
   button that mounts mid-transition has no width to grow from. Kept out of the
   tab order and off the pointer while it's collapsed.

   Widths are driven by `flexGrow` rather than the row's `gap`, because gap can't
   be animated per item and a zero-width button would still be holding its share
   of it — the collapsed row would carry dead space. */
function WalletButton({ wallet, compact, hidden, first, onPress }) {
  const s = WALLET_STYLE[wallet];
  return (
    /* The mark is aria-hidden, so this label is the button's only accessible name */
    <button onClick={() => onPress(wallet)} aria-label={`Buy now with ${wallet}`}
      aria-hidden={hidden} tabIndex={hidden ? -1 : 0}
      style={{ flexGrow: hidden ? 0 : 1, flexBasis:0, minWidth:0, overflow:"hidden",
        marginLeft: first || hidden ? 0 : WALLET_CLEAR, opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        height:WALLET_BTN_H, padding: hidden ? 0 : `0 ${WALLET_CLEAR}px`,
        borderRadius:T.radius, border:"none", cursor:"pointer",
        background:s.bg, color:s.fg, fontSize:16, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"flex-grow .3s ease, margin-left .3s ease, opacity .25s ease" }}
      onMouseEnter={e => e.currentTarget.style.opacity=".85"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}>
      {/* One button can afford the words; a row of marks carries its own
          recognition. The words collapse rather than disappear, so the mark slides
          to the middle instead of jumping there. The fade is much quicker than the
          collapse — held longer, the text is still faintly on screen while the mark
          slides over it and reads as a rendering fault. */}
      <span style={{ maxWidth: compact ? 0 : 140, opacity: compact ? 0 : 1,
        overflow:"hidden", whiteSpace:"nowrap",
        transition:"max-width .3s ease, opacity .1s ease" }}>Buy now with</span>
      {/* Not WalletMark: that one caps `maxWidth:100%` so the checkout's three-up row
          can shrink together, and inside this content-sized flex wrapper the
          percentage has no definite width to resolve against — the mark collapses to
          nothing. Height alone still preserves the artwork's own ratio, which is what
          all three brands actually ask for. */}
      <span style={{ display:"flex", marginLeft: compact ? 0 : 8, flexShrink:0,
        transition:"margin-left .3s ease" }}>
        <img src={s.img} alt="" aria-hidden="true"
          style={{ display:"block", flexShrink:0, height:WALLET_MARK, width:"auto" }} />
      </span>
    </button>
  );
}

/* Two treatments, comparable side by side from the demo settings, because
   "reduce clutter" and "show all options" pull against each other:

     single — one wallet (the device-preferred one). "More payment options"
              reveals the rest in place, so every wallet is one tap away.
     row    — every available wallet at once. Nothing hidden, but all three brand
              marks are always on screen.

   Once every wallet is shown the link retires: paying by card is what Continue to
   checkout directly above already leads to, and a second signpost to the same
   place only competes with it. */
const EXPRESS_STYLES = {
  single: "One button (expands)",
  row:    "All wallets",
};

function ExpressBuySection({ wallets, style = "single", onPress }) {
  const [expanded, setExpanded] = useState(false);
  if (!wallets.length) return null;

  const multi     = wallets.length > 1;
  const showAll   = style === "row" || expanded;
  const compact   = showAll && multi;
  const canReveal = style === "single" && multi;

  /* Spacing is on the children rather than a column `gap`, because a collapsed
     child would still be holding its gap and the row would shift the moment the
     reveal started. */
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
            are compact from the start — otherwise they arrive with a full-width
            "Buy now with" collapsing behind their own mark. */}
        {wallets.map((w, i) => (
          <WalletButton key={w} wallet={w} first={i === 0} compact={compact || i > 0}
            hidden={i > 0 && !showAll} onPress={onPress} />
        ))}
      </div>
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
    </div>
  );
}

/* ── Guest / Sign-in accordion (with inline reset flow) ── */
/* `presetEmail` seeds the field so a preloaded review link (?step=payment) shows a
   completed sign-in step with the email in its summary, rather than a ticked
   section with nothing under it. */
function GuestSignIn({ open, onToggle, completed, onContinue, presetEmail }) {
  const [tab,         setTab]         = useState("guest");  // "guest" | "signin"
  const [subflow,     setSubflow]     = useState("main");   // "main" | "reset" | "resetSent"
  const [email,       setEmail]       = useState(presetEmail || "");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [resetEmail,  setResetEmail]  = useState("");
  const [errors,      setErrors]      = useState({});

  const isValidEmail = v => v && v.includes("@") && v.includes(".");
  const guestReady   = isValidEmail(email);

  /* ── Demo auto-fill ── */
  const DEMO_EMAIL = "jane.doe@blurb.com";
  const DEMO_PW    = "Demo1234";
  const fillDemoGuest  = () => { if (!email) { setEmail(DEMO_EMAIL); setErrors({}); } };
  const fillDemoSignin = () => { if (!email || !password) { setEmail(DEMO_EMAIL); setPassword(DEMO_PW); setErrors({}); } };

  const handleGuest = () => {
    if (!isValidEmail(email)) return setErrors({ email:"Enter a valid email address." });
    setErrors({});
    onContinue(email, "guest");
  };

  const handleSignIn = () => {
    const errs = {};
    if (!isValidEmail(email)) errs.email    = "Enter a valid email address.";
    if (!password)            errs.password = "Enter your password";
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    onContinue(email, "signin");
  };

  /* ── Social sign-in (demo: jumps straight in with a provider email) ── */
  const handleSocial = provider => {
    const demoEmail = { google:"jane.doe@gmail.com", apple:"jane.doe@icloud.com", facebook:"jane.doe@facebook.com" }[provider];
    onContinue(demoEmail, "signin");
  };

  const switchTab = key => { setTab(key); setErrors({}); setSubflow("main"); };

  const tabStyle = key => ({
    background:"none", border:"none",
    borderBottom: tab===key ? `3px solid ${T.brand}` : "3px solid transparent",
    padding:"10px 0", cursor:"pointer",
    fontSize:15, fontWeight: tab===key ? 700 : 400,
    color:T.textBold, marginBottom:-1,
  });

  const renderInner = () => {
    /* ── Password reset embedded ── */
    if (subflow === "reset") return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <button
          onClick={() => setSubflow("main")}
          style={{ background:"none", border:"none", color:T.textLink, fontSize:14, fontWeight:600, cursor:"pointer", padding:0, textAlign:"left", textDecoration:"underline", alignSelf:"flex-start" }}
        >
          Back to sign in
        </button>
        <div>
          <p style={{ fontSize:16, fontWeight:700, color:T.textBold, marginBottom:4 }}>Reset your password</p>
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5 }}>
            Enter the email address on your account and we'll send you a reset link.
          </p>
        </div>
        <Input label="Email address" required placeholder="name@example.com"
          value={resetEmail} onChange={setResetEmail} type="email" />
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={() => setSubflow("resetSent")}>Send reset link</Btn>
          <Btn variant="secondary" onClick={() => onContinue(resetEmail || "user@example.com", "guest")}>Continue as guest</Btn>
        </div>
      </div>
    );

    if (subflow === "resetSent") return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <button
          onClick={() => setSubflow("main")}
          style={{ background:"none", border:"none", color:T.textLink, fontSize:14, fontWeight:600, cursor:"pointer", padding:0, textAlign:"left", textDecoration:"underline", alignSelf:"flex-start" }}
        >
          Back to sign in
        </button>
        <div>
          <p style={{ fontSize:16, fontWeight:700, color:T.textBold, marginBottom:4 }}>Check your email</p>
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5 }}>
            We sent a reset link to <strong>{resetEmail || "name@email.com"}</strong>.
            If you don't see it, check your spam or bulk folder.
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={() => setSubflow("main")}>Back to sign in</Btn>
          <Btn variant="secondary" onClick={() => onContinue(resetEmail || "user@example.com", "guest")}>Continue as guest</Btn>
        </div>
      </div>
    );

    /* ── Main tabs ── */
    return (
      <>
        <div style={{ display:"flex", gap:24, borderBottom:`1px solid ${T.border}` }}>
          <button style={tabStyle("signin")} onClick={() => switchTab("signin")}>Sign in</button>
          <button style={tabStyle("guest")}  onClick={() => switchTab("guest")}>Guest checkout</button>
        </div>

        {tab === "guest" ? (
          <>
            <Input
              label="Email address" required type="email"
              placeholder="name@example.com"
              hint="Your order confirmation will be sent here."
              error={errors.email} value={email}
              onChange={v => { setEmail(v); setErrors({}); }}
              onClick={fillDemoGuest}
            />
            <div>
              <Btn onClick={handleGuest} disabled={!guestReady}>
                Continue as guest
              </Btn>
            </div>
          </>
        ) : (
          <>
            <Input
              label="Email address" required type="email"
              placeholder="name@example.com"
              error={errors.email} value={email}
              onChange={v => { setEmail(v); setErrors({}); }}
              onClick={fillDemoSignin}
            />
            <Input
              label="Password" required
              type={showPw ? "text" : "password"}
              error={errors.password} value={password}
              onChange={v => { setPassword(v); setErrors({}); }}
              onClick={fillDemoSignin}
              rightIcon={
                <button
                  onClick={() => setShowPw(s => !s)}
                  style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex", alignItems:"center" }}
                >
                  <IconVisibility size={20} on={showPw} />
                </button>
              }
            />
            <div><Btn onClick={handleSignIn}>Sign in</Btn></div>
            <button
              onClick={() => setSubflow("reset")}
              style={{ background:"none", border:"none", color:T.textLink, fontSize:14, cursor:"pointer", textDecoration:"underline", textAlign:"left", padding:0, alignSelf:"flex-start" }}
            >
              Forgot your password?
            </button>

            {/* ── Social sign-in ── */}
            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"4px 0" }}>
              <div style={{ flex:1, height:1, background:T.border }} />
              <span style={{ fontSize:13, color:T.textSubtle }}>or continue with</span>
              <div style={{ flex:1, height:1, background:T.border }} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              {[
                { id:"google",   label:"Google",   icon:<GoogleGlyph /> },
                { id:"apple",    label:"Apple",    icon:<AppleGlyph /> },
                { id:"facebook", label:"Facebook", icon:<FacebookGlyph /> },
              ].map(({ id, label, icon }) => (
                <button key={id} onClick={() => handleSocial(id)} aria-label={`Continue with ${label}`}
                  style={{ flex:1, height:48, border:`1px solid ${T.border}`, borderRadius:T.radius, background:T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:14, fontWeight:600, color:T.textBold, transition:"border-color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=T.brand}
                  onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <AccordionSection
      title="Sign in or continue as a guest"
      open={open}
      onToggle={onToggle}
      completed={completed}
      summary={email}
    >
      <AutoHeight>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {renderInner()}
        </div>
      </AutoHeight>
    </AccordionSection>
  );
}

/* ── Shipping Address ── */
function ShippingAddress({ open, onToggle, disabled, onComplete, savedAddress, onModify }) {
  const [form, setForm] = useState({
    firstName:"", lastName:"", company:"", phone:"", country:"",
    address:"", address2:"", city:"", state:"", zip:"", poBox:false, savePrimary:false,
  });
  const [errors, setErrors] = useState({});
  /* Typing in a field clears that field's error immediately. Leaving it there while
     someone fixes it means the message contradicts the input they're looking at. */
  const set = (k, v) => {
    setForm(f => ({...f, [k]:v}));
    setErrors(e => (e[k] ? { ...e, [k]:undefined } : e));
  };

  const cfg = COUNTRY_FIELDS[form.country] || DEFAULT_COUNTRY_FIELDS;

  /* ── One rule set, read by both blur and submit ──
     These messages existed before and could never appear: `Continue` was disabled
     until every required field was non-empty, so the only code path that produced
     them was unreachable, and an incomplete address got a dead button and no
     explanation. Keeping the rules in one function is what stops a blur and a
     submit from disagreeing about what a field's message is. */
  const REQUIRED = ["firstName","lastName","phone","country","address","city","state","zip"];
  const fieldError = (k, f) => {
    switch (k) {
      case "firstName": return f.firstName ? "" : "Enter your first name";
      case "lastName":  return f.lastName  ? "" : "Enter your last name";
      case "phone":     return f.phone     ? "" : "Enter your phone number";
      case "country":   return f.country   ? "" : "Select a country";
      /* Only asked once a country is chosen — the fields are collapsed until then,
         so reporting them empty would flag fields the buyer can't even see. */
      case "address":   return !f.country || f.address ? "" : "Enter your address";
      case "city":      return !f.country || f.city    ? "" : "Enter your city";
      case "state":     return !f.country || !cfg.stateRequired || f.state ? ""
                               : `Select a ${cfg.stateLabel.toLowerCase()}`;
      case "zip":       return !f.country || f.zip ? "" : `Enter your ${cfg.zipLabel.toLowerCase()}`;
      default: return "";
    }
  };
  /* Validate the one field being left, not the whole form — flagging fields someone
     hasn't reached yet turns a form into a wall of red on the first blur. */
  const blur = k => () => setErrors(e => ({ ...e, [k]: fieldError(k, form) || undefined }));

  /* ── Demo auto-fill ── */
  // Clicking a name field fills the contact details (not country/address).
  const fillDemoName = () => {
    if (!form.firstName && !form.lastName) {
      setForm(f => ({ ...f, firstName:"Jane", lastName:"Doe", company:"Blurb Inc.", phone:"+1 415-555-0123" }));
      setErrors({});
    }
  };
  // Clicking the address field fills the rest, matched to the chosen country.
  const fillDemoDetails = () => {
    if (!form.address) { setForm(f => ({ ...f, ...cfg.demo })); setErrors({}); }
  };

  const handleCountryChange = v => {
    // State options differ per country, so reset state when the country changes.
    setForm(f => ({ ...f, country:v, state:"" }));
    setErrors(e => ({ ...e, country:undefined }));
  };

  const handleContinue = () => {
    const e = {};
    REQUIRED.forEach(k => { const m = fieldError(k, form); if (m) e[k] = m; });
    if (Object.keys(e).length) return setErrors(e);
    onComplete(form);
  };

  const completedCollapsed = !!savedAddress && !open;
  const checkboxStyle = { display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold };

  return (
    <AccordionSection
      title="Shipping address"
      open={open}
      onToggle={completedCollapsed ? onModify : onToggle}
      disabled={false}
      completed={!!savedAddress}
      summary={savedAddress
        ? `${savedAddress.firstName} ${savedAddress.lastName} · ${[savedAddress.address, savedAddress.address2, savedAddress.city, savedAddress.country].filter(Boolean).join(", ")}`
        : null}
    >
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="First name" required
            error={errors.firstName} value={form.firstName} onChange={v => set("firstName",v)} onClick={fillDemoName} onBlur={blur("firstName")} />
          <Input label="Last name"  required
            error={errors.lastName}  value={form.lastName}  onChange={v => set("lastName",v)}  onClick={fillDemoName} onBlur={blur("lastName")} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Company"
            value={form.company} onChange={v => set("company",v)} onClick={fillDemoName} />
          <Input label="Phone number" required placeholder="123-456-7890"
            error={errors.phone} value={form.phone} onChange={v => set("phone",v)} type="tel" onClick={fillDemoName} onBlur={blur("phone")} />
        </div>

        <Combobox label="Country" required options={COUNTRIES}
          value={form.country} onChange={handleCountryChange} error={errors.country} />

        {/* Country-specific address fields reveal once a country is chosen */}
        <Collapse open={!!form.country}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Address" required placeholder="123 Main Street"
              error={errors.address} value={form.address} onChange={v => set("address",v)} onClick={fillDemoDetails} onBlur={blur("address")} />
            <Input label="Address line 2" placeholder="Apt, suite, unit, etc."
              value={form.address2} onChange={v => set("address2",v)} />
            <label style={checkboxStyle}>
              <input type="checkbox" checked={form.poBox} onChange={() => set("poBox", !form.poBox)} style={{ accentColor:T.brand }} />
              This is a PO Box
            </label>
            <Input label="City" required
              error={errors.city} value={form.city} onChange={v => set("city",v)} onClick={fillDemoDetails} onBlur={blur("city")} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {cfg.stateOptions
                ? <SelectInput label={cfg.stateLabel} required={cfg.stateRequired} options={cfg.stateOptions}
                    value={form.state} onChange={v => set("state",v)} />
                : <Input label={cfg.stateLabel} required={cfg.stateRequired}
                    error={errors.state} value={form.state} onChange={v => set("state",v)} onClick={fillDemoDetails} onBlur={blur("state")} />}
              <Input label={cfg.zipLabel} required
                error={errors.zip} value={form.zip} onChange={v => set("zip",v)} onClick={fillDemoDetails} onBlur={blur("zip")} />
            </div>
            <label style={checkboxStyle}>
              <input type="checkbox" checked={form.savePrimary} onChange={() => set("savePrimary", !form.savePrimary)} style={{ accentColor:T.brand }} />
              Save as primary address
            </label>
            <div style={{ marginTop:4 }}>
              {/* Enabled unconditionally. It used to be disabled until every required
                  field was filled, which made the per-field messages above
                  unreachable — the form's only feedback for an incomplete address was
                  a dead button. Pressing it now reports what's missing. */}
              <Btn onClick={handleContinue}>Continue</Btn>
            </div>
          </div>
        </Collapse>
      </div>
    </AccordionSection>
  );
}

/* ── Address Picker — dropdown selection + Edit/Add new, shared by shipping & billing ── */
function AddressPicker({ addresses, selectedId, onSelect, onEdit, onAddNew }) {
  const addr = addresses.find(a => a.id === selectedId) || addresses[0];
  const linkStyle = { background:"none", border:"none", padding:0, cursor:"pointer",
    color:T.textLink, fontSize:14, fontWeight:600, textDecoration:"underline" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        <label style={{ fontSize:15, fontWeight:600, color:T.textBold }}>Choose an address</label>
        <div style={{ position:"relative" }}>
          <select
            value={selectedId}
            onChange={e => onSelect(e.target.value)}
            style={{ border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"9px 11px",
              paddingRight:44, fontSize:15, color:T.textBold, background:T.surface, width:"100%", appearance:"none" }}
          >
            {addresses.map(a => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}, {[a.address, a.address2, a.city, a.state, a.zip].filter(Boolean).join(", ")}
              </option>
            ))}
          </select>
          <span className="ms" style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
            pointerEvents:"none", color:T.textBold, fontSize:22 }}>expand_more</span>
        </div>
      </div>
      {addr && (
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12,
          padding:"12px 14px", border:`1px solid ${T.border}`, borderRadius:T.radius }}>
          <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5 }}>
            <div style={{ fontWeight:700, color:T.textBold }}>{addr.firstName} {addr.lastName}</div>
            {addr.company && <div>{addr.company}</div>}
            <div>{addr.address}</div>
            {addr.address2 && <div>{addr.address2}</div>}
            <div>{[`${addr.city},`, addr.state, addr.zip].filter(Boolean).join(" ")}</div>
          </div>
          {/* Anchored to the card it acts on, so switching the dropdown never leaves
              "Edit" pointing at an address that's no longer shown */}
          <button style={{...linkStyle, flexShrink:0}} onClick={onEdit}>Edit address</button>
        </div>
      )}
      <button style={{...linkStyle, alignSelf:"flex-start"}} onClick={onAddNew}>Add address</button>
    </div>
  );
}

/* ── Saved Shipping Address (logged-in flow) ── */
const SAVED_ADDRESSES = [
  { id:"home", label:"Home", firstName:"Jane", lastName:"Doe", company:"Blurb Inc.",
    phone:"+1 415-555-0123", country:"United States", address:"580 California St", address2:"",
    city:"San Francisco", state:"CA", zip:"94104", poBox:false, savePrimary:true },
  { id:"grandma", label:"Grandma", firstName:"Margaret", lastName:"Doe", company:"",
    phone:"+1 208-555-0148", country:"United States", address:"742 Evergreen Terrace", address2:"",
    city:"Boise", state:"ID", zip:"83702", poBox:false, savePrimary:false },
  { id:"client", label:"Client — Acme Studios", firstName:"Alex", lastName:"Rivera", company:"Acme Studios",
    phone:"+1 212-555-0172", country:"United States", address:"19 W 24th St", address2:"Floor 5",
    city:"New York", state:"NY", zip:"10010", poBox:false, savePrimary:false },
];
const EMPTY_ADDRESS = {
  label:"", firstName:"", lastName:"", company:"", phone:"", country:"",
  address:"", address2:"", city:"", state:"", zip:"", poBox:false, savePrimary:false,
};

function SavedShippingAddress({ open, onToggle, onComplete, savedDone, onModify }) {
  const [addresses, setAddresses] = useState(SAVED_ADDRESSES);
  const [selectedId, setSelectedId] = useState(SAVED_ADDRESSES[0].id);
  const [view,  setView]  = useState("select");        // "select" | "edit"
  const [editMode, setEditMode] = useState("modify");  // "modify" | "new"
  const [draft, setDraft] = useState(SAVED_ADDRESSES[0]); // address being edited
  const [errors, setErrors] = useState({});
  const setD = (k, v) => setDraft(f => ({...f, [k]:v}));

  // Always return to the address picker when the section is (re)opened
  useEffect(() => { if (open) setView("select"); }, [open]);

  const addr = addresses.find(a => a.id === selectedId) || addresses[0];
  const cfg = COUNTRY_FIELDS[draft.country] || DEFAULT_COUNTRY_FIELDS;

  // "Edit" always modifies whichever address is currently selected in the dropdown
  const startEdit    = () => { setEditMode("modify"); setDraft(addr); setErrors({}); setView("edit"); };
  const startAddNew  = () => { setEditMode("new"); setDraft(EMPTY_ADDRESS); setErrors({}); setView("edit"); };
  const cancelEdit   = () => { setErrors({}); setView("select"); };
  // Demo auto-fill: clicking a name field fills contact details; clicking the address field fills the rest.
  const fillDemoName = () => {
    if (!draft.firstName && !draft.lastName) {
      setDraft(f => ({ ...f, firstName:"Jane", lastName:"Doe", company:"Blurb Inc.", phone:"+1 415-555-0123" }));
      setErrors({});
    }
  };
  const fillDemoDetails = () => {
    if (!draft.address) { setDraft(f => ({ ...f, ...((COUNTRY_FIELDS[f.country] || DEFAULT_COUNTRY_FIELDS).demo) })); setErrors({}); }
  };
  const handleCountryChange = v => { setDraft(f => ({ ...f, country:v, state:"" })); setErrors(e => ({ ...e, country:undefined })); };

  const saveChanges = () => {
    const e = {};
    if (!draft.firstName) e.firstName = "Enter your first name";
    if (!draft.lastName)  e.lastName  = "Enter your last name";
    if (!draft.phone)     e.phone     = "Enter your phone number";
    if (!draft.country)   e.country   = "Select a country";
    if (!draft.address)   e.address   = "Enter your address";
    if (!draft.city)      e.city      = "Enter your city";
    if (cfg.stateRequired && !draft.state) e.state = `Select a ${cfg.stateLabel.toLowerCase()}`;
    if (!draft.zip)       e.zip       = `Enter your ${cfg.zipLabel.toLowerCase()}`;
    if (Object.keys(e).length) return setErrors(e);
    if (editMode === "modify") {
      setAddresses(list => list.map(a => a.id === selectedId ? { ...draft, id:selectedId, label:a.label } : a));
    } else {
      const id = "addr-" + (addresses.length + 1);
      const label = draft.company || `${draft.firstName} ${draft.lastName}`.trim();
      setAddresses(list => [...list, { ...draft, id, label }]);
      setSelectedId(id);
    }
    setErrors({}); setView("select");
  };

  const checkboxStyle = { display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold };
  const summaryText = `${addr.firstName} ${addr.lastName} · ${[addr.address, addr.address2, addr.city, addr.country].filter(Boolean).join(", ")}`;

  return (
    <AccordionSection
      title="Shipping address"
      open={open}
      onToggle={savedDone ? onModify : onToggle}
      disabled={false}
      completed={savedDone}
      summary={summaryText}
    >
      <AutoHeight>
        {view === "select" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <AddressPicker
              addresses={addresses}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={startEdit}
              onAddNew={startAddNew}
            />
            <div style={{ marginTop:4 }}>
              <Btn onClick={() => onComplete(addr)}>Continue</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="First name" required
                error={errors.firstName} value={draft.firstName} onChange={v => setD("firstName",v)} onClick={fillDemoName} />
              <Input label="Last name" required
                error={errors.lastName} value={draft.lastName} onChange={v => setD("lastName",v)} onClick={fillDemoName} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Company"
                value={draft.company} onChange={v => setD("company",v)} onClick={fillDemoName} />
              <Input label="Phone number" required placeholder="123-456-7890"
                error={errors.phone} value={draft.phone} onChange={v => setD("phone",v)} type="tel" onClick={fillDemoName} />
            </div>
            <Combobox label="Country" required options={COUNTRIES}
              value={draft.country} onChange={handleCountryChange} error={errors.country} />
            <Collapse open={!!draft.country}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Input label="Address" required placeholder="123 Main Street"
                  error={errors.address} value={draft.address} onChange={v => setD("address",v)} onClick={fillDemoDetails} />
                <Input label="Address line 2" placeholder="Apt, suite, unit, etc."
                  value={draft.address2} onChange={v => setD("address2",v)} />
                <label style={checkboxStyle}>
                  <input type="checkbox" checked={draft.poBox} onChange={() => setD("poBox", !draft.poBox)} style={{ accentColor:T.brand }} />
                  This is a PO Box
                </label>
                <Input label="City" required
                  error={errors.city} value={draft.city} onChange={v => setD("city",v)} onClick={fillDemoDetails} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {cfg.stateOptions
                    ? <SelectInput label={cfg.stateLabel} required={cfg.stateRequired} options={cfg.stateOptions}
                        value={draft.state} onChange={v => setD("state",v)} />
                    : <Input label={cfg.stateLabel} required={cfg.stateRequired}
                        error={errors.state} value={draft.state} onChange={v => setD("state",v)} onClick={fillDemoDetails} />}
                  <Input label={cfg.zipLabel} required
                    error={errors.zip} value={draft.zip} onChange={v => setD("zip",v)} onClick={fillDemoDetails} />
                </div>
                <label style={checkboxStyle}>
                  <input type="checkbox" checked={draft.savePrimary} onChange={() => setD("savePrimary", !draft.savePrimary)} style={{ accentColor:T.brand }} />
                  Save as primary address
                </label>
              </div>
            </Collapse>
            {/* Always available — even before a country is picked, so the user can back out */}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <Btn onClick={saveChanges}>{editMode === "new" ? "Save address" : "Save changes"}</Btn>
              <Btn variant="secondary" onClick={cancelEdit}>Cancel</Btn>
            </div>
          </div>
        )}
      </AutoHeight>
    </AccordionSection>
  );
}

/* ── Billing address ───────────────────────────────────────────────────────────
   Its own section rather than a form nested inside Payment. Three reasons, none
   of them cosmetic:

   1. Blurby already requires a billing address for wallet payments (Apple Pay,
      Google Pay), because using the address the wallet returns needs backend work
      that hasn't been done. So billing is collected on every order today — this
      moves it, it doesn't add it.
   2. Tax on orders with digital items is calculated from the billing address, so
      it has to be known before the total can be right.
   3. A billing form nested inside the payment form isn't representable in
      semantic HTML — `<form>` can't contain `<form>`. Faking it means hand-rolling
      grouping, validation and focus management, and losing the accessibility that
      comes free from doing it properly.

   The cost of a section is a step, so this one is built to cost nothing in the
   common case: completing Shipping address auto-completes it as "Same as shipping
   address" and the flow moves straight on to Shipping method. The buyer only
   stops here if they choose to. Payment shows what was captured and links back. */
function BillingAddress({ open, onToggle, disabled, completed, shippingAddr, billing, sameAsShipping, onComplete, loggedIn, noShipping = false }) {
  /* `noShipping` is a digital-only order: nothing is being shipped, so there is no
     shipping address for this one to be the same as. The checkbox is removed rather
     than left unticked — an unticked "same as shipping" still implies a shipping
     address exists somewhere above — and this becomes the only address on the order. */
  const [same, setSame] = useState(noShipping ? false : sameAsShipping !== false);
  /* Guest: a typed billing address. Only the fields tax and card verification need —
     the name and phone come from the account / card, as they did when this lived
     inside Payment. */
  const [form,   setForm]   = useState(billing && !sameAsShipping ? billing : EMPTY_ADDRESS);
  const [errors, setErrors] = useState({});
  const setF  = (k, v) => setForm(f => ({...f, [k]:v}));
  const cfg   = COUNTRY_FIELDS[form.country] || DEFAULT_COUNTRY_FIELDS;
  const handleCountry = v => { setForm(f => ({ ...f, country:v, state:"" })); setErrors(e => ({ ...e, country:undefined })); };
  const fillDemo = () => { if (!form.address) { setForm(f => ({ ...f, ...((COUNTRY_FIELDS[f.country] || DEFAULT_COUNTRY_FIELDS).demo) })); setErrors({}); } };

  /* Logged-in: pick from saved addresses, with the same Edit / Add new picker the
     shipping section uses. */
  const [addresses, setAddresses] = useState(SAVED_ADDRESSES);
  const [selectedId, setSelectedId] = useState(SAVED_ADDRESSES[0].id);
  const [view, setView] = useState("select");        // "select" | "edit"
  const [editMode, setEditMode] = useState("modify"); // "modify" | "new"
  const [draft, setDraft] = useState(SAVED_ADDRESSES[0]);
  const [draftErrors, setDraftErrors] = useState({});
  const setD = (k, v) => setDraft(f => ({...f, [k]:v}));
  const draftCfg = COUNTRY_FIELDS[draft.country] || DEFAULT_COUNTRY_FIELDS;
  const selectedAddr = addresses.find(a => a.id === selectedId) || addresses[0];
  const startEdit   = () => { setEditMode("modify"); setDraft(selectedAddr); setDraftErrors({}); setView("edit"); };
  const startAddNew = () => { setEditMode("new"); setDraft(EMPTY_ADDRESS); setDraftErrors({}); setView("edit"); };
  const cancelEdit  = () => { setDraftErrors({}); setView("select"); };
  const fillDraftName = () => {
    if (!draft.firstName && !draft.lastName) {
      setDraft(f => ({ ...f, firstName:"Jane", lastName:"Doe", company:"Blurb Inc.", phone:"+1 415-555-0123" }));
      setDraftErrors({});
    }
  };
  const fillDraftDemo = () => {
    if (!draft.address) { setDraft(f => ({ ...f, ...((COUNTRY_FIELDS[f.country] || DEFAULT_COUNTRY_FIELDS).demo) })); setDraftErrors({}); }
  };
  const handleDraftCountry = v => { setDraft(f => ({ ...f, country:v, state:"" })); setDraftErrors(e => ({ ...e, country:undefined })); };
  const saveChanges = () => {
    const e = {};
    if (!draft.firstName) e.firstName = "Enter your first name";
    if (!draft.lastName)  e.lastName  = "Enter your last name";
    if (!draft.phone)     e.phone     = "Enter your phone number";
    if (!draft.country)   e.country   = "Select a country";
    if (!draft.address)   e.address   = "Enter your address";
    if (!draft.city)      e.city      = "Enter your city";
    if (draftCfg.stateRequired && !draft.state) e.state = `Select a ${draftCfg.stateLabel.toLowerCase()}`;
    if (!draft.zip)       e.zip       = `Enter your ${draftCfg.zipLabel.toLowerCase()}`;
    if (Object.keys(e).length) return setDraftErrors(e);
    if (editMode === "modify") {
      setAddresses(list => list.map(a => a.id === selectedId ? { ...draft, id:selectedId, label:a.label } : a));
    } else {
      const id = "billing-addr-" + (addresses.length + 1);
      const label = draft.company || `${draft.firstName} ${draft.lastName}`.trim();
      setAddresses(list => [...list, { ...draft, id, label }]);
      setSelectedId(id);
    }
    setDraftErrors({}); setView("select");
  };
  /* Back to the picker whenever "same as shipping" is chosen again, so re-opening
     the section never lands mid-edit on an address it isn't going to use. */
  useEffect(() => { if (same) setView("select"); }, [same]);
  /* The section outlives a restart of the flow — switching identity or coming back
     through the cart clears the committed billing address above without unmounting
     this. Follow it back to the default, or the radio still reads "different
     billing address" on a checkout that has no billing address at all. */
  useEffect(() => {
    if (noShipping) return;   // there is no shipping address to fall back to
    if (!billing) setSame(sameAsShipping !== false);
  }, [billing, sameAsShipping, noShipping]);

  const handleContinue = () => {
    if (same) return onComplete(shippingAddr, true);
    if (loggedIn) return onComplete(selectedAddr, false);
    const e = {};
    if (!form.country) e.country = "Select a country";
    if (!form.address) e.address = "Enter your address";
    if (!form.city)    e.city    = "Enter your city";
    if (cfg.stateRequired && !form.state) e.state = `Select a ${cfg.stateLabel.toLowerCase()}`;
    if (!form.zip)     e.zip     = `Enter your ${cfg.zipLabel.toLowerCase()}`;
    if (Object.keys(e).length) return setErrors(e);
    onComplete(form, false);
  };

  const checkboxStyle = { display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold };

  return (
    <AccordionSection
      title="Billing address"
      open={open}
      onToggle={onToggle}
      disabled={disabled}
      completed={completed}
      summary={sameAsShipping && !noShipping ? "Same as shipping address" : billingSummary(billing)}
    >
      <AutoHeight>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {/* A billing address asked for on its own invites "why?". Answering it in one
            line costs nothing and stops the section reading as a form for its own
            sake — both reasons are true of every order, wallet or card. */}
        <p style={{ fontSize:13, color:T.textSubtle, lineHeight:1.5 }}>
          Used to calculate tax and to verify your payment.
        </p>
        {/* The same checkbox this question has always used — it lived inside Payment
            before billing became its own section, and moving the section is no reason
            to change the control. Two radio cards said the same thing in more space
            and read as a new pattern next to the shipping section's own controls. */}
        {!noShipping && (
        <label style={checkboxStyle}>
          <input type="checkbox" checked={same}
            onChange={() => { setSame(s => !s); setErrors({}); }}
            style={{ accentColor:T.brand }} />
          Same as shipping address
        </label>
        )}
        {/* Which address "same" resolves to — the claim is only checkable against the
            address itself, and the shipping section is collapsed by this point. */}
        {same && shippingAddr && (
          <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5, paddingLeft:24 }}>
            <div style={{ fontWeight:700, color:T.textBold }}>{shippingAddr.firstName} {shippingAddr.lastName}</div>
            {shippingAddr.company && <div>{shippingAddr.company}</div>}
            <div>{shippingAddr.address}</div>
            {shippingAddr.address2 && <div>{shippingAddr.address2}</div>}
            <div>{[`${shippingAddr.city},`, shippingAddr.state, shippingAddr.zip].filter(Boolean).join(" ")}</div>
          </div>
        )}

        <Collapse open={!same}>
          {loggedIn ? (
            view === "select" ? (
              <div style={{ paddingTop:4 }}>
                <AddressPicker
                  addresses={addresses}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onEdit={startEdit}
                  onAddNew={startAddNew}
                />
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:4 }}>
                <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Input label="First name" required
                    error={draftErrors.firstName} value={draft.firstName} onChange={v => setD("firstName",v)} onClick={fillDraftName} />
                  <Input label="Last name" required
                    error={draftErrors.lastName} value={draft.lastName} onChange={v => setD("lastName",v)} onClick={fillDraftName} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Input label="Company"
                    value={draft.company} onChange={v => setD("company",v)} onClick={fillDraftName} />
                  <Input label="Phone number" required placeholder="123-456-7890"
                    error={draftErrors.phone} value={draft.phone} onChange={v => setD("phone",v)} type="tel" onClick={fillDraftName} />
                </div>
                <Combobox label="Country" required options={COUNTRIES}
                  value={draft.country} onChange={handleDraftCountry} error={draftErrors.country} />
                <Collapse open={!!draft.country}>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <Input label="Address" required placeholder="123 Main Street"
                      error={draftErrors.address} value={draft.address} onChange={v => setD("address",v)} onClick={fillDraftDemo} />
                    <Input label="Address line 2" placeholder="Apt, suite, unit, etc."
                      value={draft.address2} onChange={v => setD("address2",v)} />
                    <Input label="City" required
                      error={draftErrors.city} value={draft.city} onChange={v => setD("city",v)} onClick={fillDraftDemo} />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {draftCfg.stateOptions
                        ? <SelectInput label={draftCfg.stateLabel} required={draftCfg.stateRequired} options={draftCfg.stateOptions}
                            value={draft.state} onChange={v => setD("state",v)} />
                        : <Input label={draftCfg.stateLabel} required={draftCfg.stateRequired}
                            error={draftErrors.state} value={draft.state} onChange={v => setD("state",v)} onClick={fillDraftDemo} />}
                      <Input label={draftCfg.zipLabel} required
                        error={draftErrors.zip} value={draft.zip} onChange={v => setD("zip",v)} onClick={fillDraftDemo} />
                    </div>
                  </div>
                </Collapse>
                <div style={{ display:"flex", gap:10, marginTop:4 }}>
                  <Btn onClick={saveChanges}>{editMode === "new" ? "Save address" : "Save changes"}</Btn>
                  <Btn variant="secondary" onClick={cancelEdit}>Cancel</Btn>
                </div>
              </div>
            )
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:4 }}>
              <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
              <Combobox label="Country" required options={COUNTRIES}
                value={form.country} onChange={handleCountry} error={errors.country} />
              <Collapse open={!!form.country}>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <Input label="Address" required placeholder="123 Main Street"
                    error={errors.address} value={form.address} onChange={v => setF("address",v)} onClick={fillDemo} />
                  <Input label="Address line 2" placeholder="Apt, suite, unit, etc."
                    value={form.address2} onChange={v => setF("address2",v)} />
                  <Input label="City" required
                    error={errors.city} value={form.city} onChange={v => setF("city",v)} onClick={fillDemo} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {cfg.stateOptions
                      ? <SelectInput label={cfg.stateLabel} required={cfg.stateRequired} options={cfg.stateOptions}
                          value={form.state} onChange={v => setF("state",v)} />
                      : <Input label={cfg.stateLabel} required={cfg.stateRequired}
                          error={errors.state} value={form.state} onChange={v => setF("state",v)} onClick={fillDemo} />}
                    <Input label={cfg.zipLabel} required
                      error={errors.zip} value={form.zip} onChange={v => setF("zip",v)} onClick={fillDemo} />
                  </div>
                </div>
              </Collapse>
            </div>
          )}
        </Collapse>

        {/* One primary action at a time — hidden while a saved address is being edited */}
        {!(!same && loggedIn && view === "edit") && (
          <div style={{ marginTop:4 }}>
            <Btn onClick={handleContinue}>Continue</Btn>
          </div>
        )}
      </div>
      </AutoHeight>
    </AccordionSection>
  );
}

/* One-line billing address, for the section summary and the row in Payment */
const billingSummary = a => a
  ? [a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : null,
     [a.address, a.address2, a.city, a.state, a.zip].filter(Boolean).join(", ")].filter(Boolean).join(" · ")
  : null;

/* ── Shipping Options ── */
function ShippingOptions({ open, onToggle, disabled, onConfirm, savedMethod, freeShipping }) {
  const [selected, setSelected] = useState(savedMethod || null);
  const opts = [
    { id:"economy",  label:"Economy",  desc:"Arrives by May 30", price:9.99  },
    { id:"standard", label:"Standard", desc:"Arrives by May 24", price:14.99 },
    { id:"express",  label:"Express",  desc:"Arrives by May 21", price:24.99 },
  ];
  const selectedOpt = opts.find(o => o.id === selected);
  const savedOpt    = opts.find(o => o.id === savedMethod);

  return (
    <AccordionSection
      title="Shipping method"
      open={open}
      onToggle={onToggle}
      disabled={disabled}
      completed={!!savedMethod}
      summary={savedOpt
        ? `${savedOpt.label} · ${freeShipping ? "Free" : `$${savedOpt.price.toFixed(2)}`} · ${savedOpt.desc}`
        : null}
    >
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {opts.map(o => (
          <label key={o.id}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
              border:`1px solid ${selected===o.id ? T.brand : T.border}`,
              borderRadius:T.radius, cursor:"pointer",
              background: selected===o.id ? "#f0f7fb" : T.surface }}
          >
            <input type="radio" name="shipping" value={o.id} checked={selected===o.id}
              onChange={() => setSelected(o.id)} style={{ accentColor:T.brand }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:15, color:T.textBold }}>{o.label}</div>
              <div style={{ fontSize:13, color:T.textSubtle }}>{o.desc}</div>
            </div>
            {/* Every tier is free under a free-shipping code, so every price is
                struck through rather than rewritten — the buyer can still see which
                service they're choosing, and what it would normally cost. */}
            {freeShipping ? (
              <span style={{ display:"flex", alignItems:"center", gap:6, fontWeight:600 }}>
                <span style={{ color:T.textSubtle, textDecoration:"line-through" }}>${o.price.toFixed(2)}</span>
                <span style={{ color:T.success }}>Free</span>
              </span>
            ) : (
              <span style={{ fontWeight:600, color:T.textBold }}>${o.price.toFixed(2)}</span>
            )}
          </label>
        ))}
        {selected && (
          <div style={{ marginTop:4 }}>
            {/* Reports the list price even when shipping is free: the waiver belongs to
                the code, not to the method, so removing the code has to give the real
                cost back rather than leave the order shipping for nothing. */}
            <Btn onClick={() => onConfirm(selected, selectedOpt.price)}>
              Continue
            </Btn>
          </div>
        )}
      </div>
    </AccordionSection>
  );
}

/* ── Card-brand mini-icon (40×30 bordered box, matching Figma) ── */
function CardBrandIcon({ src, blue }) {
  return (
    <span style={{
      width:40, height:30, border:"1px solid #dcdcdc", borderRadius:6,
      background: blue ? "#1f72cd" : "#fff", flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"5px 6px",
    }}>
      <img src={src} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", display:"block" }} />
    </span>
  );
}

/* ── Right-aligned payment mark(s) for a payment row ── */
function PayMark({ id }) {
  if (id === "card") return (
    <span style={{ display:"flex", gap:8, flexShrink:0 }}>
      <CardBrandIcon src={VISA} />
      <CardBrandIcon src={MASTERCARD} />
      <CardBrandIcon src={AMEX} blue />
      <CardBrandIcon src={DISCOVER} />
    </span>
  );
  const src = { apple:APPLE_PAY, gpay:GPAY, paypal:PAYPAL_IMG }[id];
  return <img src={src} alt="" style={{ height:24, width:"auto", objectFit:"contain", display:"block", flexShrink:0 }} />;
}

/* ── Payment ── */
function Payment({ open, onToggle, disabled, onComplete, completed }) {
  const [method,          setMethod]          = useState(null);   // radio selection
  const [applied,         setApplied]         = useState(null);   // selection committed via Continue
  const [confirmedMethod, setConfirmedMethod] = useState(null);
  const [paySuccess,      setPaySuccess]      = useState(false);
  const [card,            setCard]            = useState({ number:"", name:"", expiry:"", cvv:"" });
  const [showCvv,         setShowCvv]         = useState(false);
  const [errors,          setErrors]          = useState({});
  const setC = (k, v) => setCard(c => ({...c, [k]:v}));

  /* ── Demo auto-fill ── */
  const DEMO_CARD = { number:"4242 4242 4242 4242", name:"Jane Doe", expiry:"12/2027", cvv:"321" };
  const fillDemoCard = () => {
    if (!card.number && !card.name) {
      setCard(DEMO_CARD);
      setMethod("card");
      setErrors({});
    }
  };

  const PAY_OPTIONS = [
    { id:"card",   label:"Credit or debit card" },
    { id:"apple",  label:"Apple Pay" },
    { id:"gpay",   label:"Google Pay" },
    { id:"paypal", label:"PayPal" },
    /* Klarna removed 2026-08-21 (audit row 5.6). It existed here and not in the
       Checkout Link fork, which made it drift rather than a decision — the two
       files now offer the same four methods. The `Pay in 4 × $40.75` label was
       also a hardcoded instalment of a fixed cart total, so it stated the wrong
       figure for any other order. */
  ];

  const METHOD_LABELS = { card:"Credit or debit card", apple:"Apple Pay", gpay:"Google Pay", paypal:"PayPal" };

  const INFO = {
    apple:  "You'll be prompted to authorize with Apple Pay after reviewing your order.",
    gpay:   "You'll be prompted to authorize with Google Pay after reviewing your order.",
    paypal: "You'll be redirected to PayPal to complete your payment.",
  };

  const handleConfirm = () => {
    if (method === "card") {
      const e = {};
      if (!card.number) e.number = "Enter your card number";
      else if (card.number.replace(/\s/g,"").length < 13) e.number = "Enter a valid card number";
      if (!card.name)   e.name   = "Enter the name on your card";
      if (!card.expiry) e.expiry = "Enter the expiry date";
      if (!card.cvv) e.cvv = "Enter the security code";
      else if (card.cvv.length < 3) e.cvv = "Security code must be at least 3 digits";
      if (Object.keys(e).length) return setErrors(e);
    }
    setConfirmedMethod(method);
    setPaySuccess(true);
    setTimeout(() => { setPaySuccess(false); onComplete(method); }, 1100);
  };

  /* Back to step 1 — re-shows the full list with the current pick still selected */
  const chooseAnother = (
    <button
      onClick={() => { setApplied(null); setErrors({}); }}
      style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0, cursor:"pointer",
        color:T.textLink, fontSize:14, fontWeight:600, textDecoration:"underline" }}
    >
      Choose another way to pay
    </button>
  );

  /* Card fields + billing address — rendered under the card radio row once applied */
  const cardForm = (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <IconLock size={16} />
        <span style={{ fontSize:13, color:T.textSubtle }}>Your payment is encrypted</span>
      </div>
      <p style={{ fontSize:12, color:T.textSubtle }}>Required fields are marked *</p>
      <Input label="Card number" required
        error={errors.number} value={card.number} onChange={v => setC("number",v)} onClick={fillDemoCard} />
      <Input label="Name on card" required
        error={errors.name} value={card.name} onChange={v => setC("name",v)} onClick={fillDemoCard} />
      <Input label="Expiration date (MM/YYYY)" required
        error={errors.expiry} value={card.expiry} onChange={v => setC("expiry",v)} onClick={fillDemoCard} />
      <Input label="Security code (CVV)" required
        error={errors.cvv} value={card.cvv} onChange={v => setC("cvv",v)} onClick={fillDemoCard}
        rightIcon={
          <button onClick={() => setShowCvv(s => !s)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex", alignItems:"center" }}>
            <IconVisibility size={16} on={showCvv} />
          </button>
        }
      />
    </div>
  );

  /* No billing row here. Billing has its own section immediately above, collapsed to
     its summary once confirmed and re-openable from there, so repeating it inside
     Payment restated something already on screen a few hundred pixels up. */

  return (
    <AccordionSection
      title="Payment"
      open={open}
      onToggle={onToggle}
      disabled={disabled}
      completed={completed}
      summary={METHOD_LABELS[confirmedMethod] || "Payment method confirmed"}
    >
      <AutoHeight>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {/* Step 1: pick a method from the full list. Step 2 (after Continue): only the
            applied method stays, expanded, and Continue submits it. */}
        {PAY_OPTIONS.filter(o => !applied || o.id === applied).map(o => (
          <React.Fragment key={o.id}>
            <label
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                padding:"12px 14px", borderRadius:T.radius, cursor:"pointer",
                border:`1px solid ${method===o.id ? T.brand : T.border}`,
                background: method===o.id ? "#f0f7fb" : T.surface }}
            >
              <span style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                <input type="radio" name="paymethod" checked={method===o.id}
                  onChange={() => { setMethod(o.id); setErrors({}); }}
                  style={{ accentColor:T.brand, flexShrink:0 }} />
                <span style={{ fontSize:15, color:T.textBold }}>{o.label}</span>
              </span>
              <PayMark id={o.id} />
            </label>
            {applied === o.id && o.id === "card" && cardForm}
            {applied === o.id && o.id !== "card" && !paySuccess && INFO[o.id] && (
              <Alert type="info" message={INFO[o.id]} />
            )}
          </React.Fragment>
        ))}

        {applied && !paySuccess && chooseAnother}

        {paySuccess && (
          <Alert type="success" message={`✓ ${METHOD_LABELS[method]} confirmed — you're all set!`} />
        )}

        {/* Step 1 Continue applies the chosen method (disabled until one is picked);
            step 2 Continue submits. */}
        {!applied ? (
          <div style={{ marginTop:4 }}>
            <Btn onClick={() => { setApplied(method); setErrors({}); }} disabled={!method}>Continue</Btn>
          </div>
        ) : !paySuccess && (
          <div style={{ marginTop:4 }}>
            <Btn onClick={handleConfirm}>Continue</Btn>
          </div>
        )}
      </div>
      </AutoHeight>
    </AccordionSection>
  );
}

/* ── A step the order has already answered ──
   Four sections can be settled by what's in the cart rather than by the buyer:
   Shipping address and Shipping method on a digital-only order, Billing address and
   Payment on a $0 order.

   All four are *shown resolved* rather than removed or disabled. A greyed-out section
   reads as broken and invites clicking. A section that simply vanishes between one
   order and the next is worse: it's what makes someone ask whether they were charged,
   or where their book is going. So the step keeps its name and its position, takes the
   same completed mark the buyer's own steps take, and says in one line what happened
   to it. Opening it gives the reason — the only thing anyone would open it for. */
function ResolvedSection({ title, summary, open, onToggle, children }) {
  return (
    <AccordionSection title={title} open={open} onToggle={onToggle} completed summary={summary}>
      <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>{children}</p>
    </AccordionSection>
  );
}

/* The four of them, named once. Both the entry screen and the checkout render these,
   and the wording has to be identical in the two places — the buyer sees the same
   section before and after signing in. `open` / `onToggle` come from the caller
   because the entry screen's sections don't open and the checkout's do. */
const DigitalShippingAddress = props => (
  <ResolvedSection title="Shipping address" summary="Digital delivery" {...props}>
    Your order is a PDF download, so there's nothing to ship and no address to enter.
  </ResolvedSection>
);
const DigitalShippingMethod = props => (
  <ResolvedSection title="Shipping method" summary="Digital delivery" {...props}>
    Your download link is emailed as soon as you place your order, so there's no
    delivery speed to choose.
  </ResolvedSection>
);
const FreeOrderBilling = props => (
  <ResolvedSection title="Billing address" summary="Not needed for this order" {...props}>
    A billing address is used to work out tax and to verify a payment. Your total is
    $0.00, so there's no tax to work out and no payment to verify.
  </ResolvedSection>
);
const FreeOrderPayment = ({ code, ...props }) => (
  <ResolvedSection title="Payment" summary="Not needed for this order" {...props}>
    Your total is $0.00{code ? <> with code <strong style={{ color:T.textBold }}>{code}</strong></> : null}.
    We won't ask for a card, and nothing will be charged.
  </ResolvedSection>
);

/* ── Express auth modal ── */
function ExpressModal({ method, onClose, onConfirm }) {
  if (!method) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:8, padding:32, maxWidth:400, width:"90%", boxShadow:"0 8px 40px rgba(0,0,0,.2)" }}>
        <h3 style={{ fontSize:20, fontWeight:700, color:T.textBold, marginBottom:12 }}>{method} Checkout</h3>
        <p style={{ color:T.textSubtle, marginBottom:20, fontSize:14 }}>
          You would be redirected to {method} to authorize and complete your purchase securely.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={onConfirm}>Authorize with {method}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ── Header (logo only, centered) ── */
function Header() {
  return (
    <div style={{ background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"14px 60px", flexShrink:0 }}>
      <img src={BLURB_LOGO} alt="Blurb" style={{ height:44 }} />
    </div>
  );
}

/* ── Footer ── */
/* ── Footer ──
   The Codex Foundation `Footer` component, context = Checkout, across all three of
   its device variants: desktop 12442:88349, tablet 12442:88413, mobile 12442:88545.
   The component also carries a Trust Bar, but it's hidden in the Checkout context,
   so only the legal bar renders.

   The three variants don't reflow from one layout — they reorder, so this is a
   switch rather than a flex-wrap:
     desktop  one row — links left (copyright first), Secure payment right
     tablet   Secure payment centred above a full-width justified row of links
     mobile   Secure payment, then the links centred and wrapped WITHOUT the
              copyright, then the copyright alone on the last line

   Replaces a footer that predated this component: light grey, an SSL claim, a
   "Contact support" link and middot separators, none of which are in the design.

   Duplicated in CheckoutLinkApp.jsx — keep the two in step. */
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
      <IconLock size={16} color="#fff" />
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

/* ── OR divider ── */
function OrDivider() {
  return (
    <div style={{ display:"flex", alignItems:"center", width:"100%" }}>
      <div style={{ flex:1, height:1, background:"#e0e0e0" }} />
      <span style={{ padding:"0 14px", fontWeight:700, color:"#595959", fontSize:18, lineHeight:1.4, whiteSpace:"nowrap" }}>OR</span>
      <div style={{ flex:1, height:1, background:"#e0e0e0" }} />
    </div>
  );
}

/* ── Order Confirmation (two left-column panels) ── */
/* Cancelling is irreversible and money moves, so it asks first. Modelled on the
   gift box modal but with two actions: the safe one dismisses, and it never says
   "Cancel" — in a cancellation dialog that word can mean either button. */
function ConfirmCancelDialog({ open, refund, hasPdf, freeOrder, onKeep, onCancelOrder }) {
  if (!open) return null;
  return (
    <div onClick={onKeep} role="dialog" aria-modal="true" aria-label="Cancel this order"
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:8, padding:24, width:460, maxWidth:"100%",
          display:"flex", flexDirection:"column", gap:12 }}>
        <p style={{ fontSize:20, fontWeight:700, color:T.textBold }}>Cancel this order?</p>
        {/* No refund sentence on a free order — there's no card and no money to
            return, and offering one would describe something that can't happen. */}
        <p style={{ fontSize:16, color:T.textBold, lineHeight:1.5 }}>
          {freeOrder
            ? <>We'll stop your {hasPdf ? "printed book" : "order"}. Nothing was charged, so there's no refund to make.</>
            : <>We'll stop your {hasPdf ? "printed book" : "order"} and refund{" "}
              <strong>{refund}</strong> to the card you used. Refunds take 3–5 business days.</>}
        </p>
        {/* Its own paragraph: folded into the sentence above, the good news reads
            as part of the bad news. */}
        {hasPdf && (
          <p style={{ fontSize:16, color:T.textBold, lineHeight:1.5 }}>
            Your PDF isn't refundable. It stays available to download.
          </p>
        )}
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
   like the SHOW_ flags above — flipping it gives the expired screen, which is the
   only other state this page can be in. */
const CANCEL_WINDOW_OPEN = true;

function OrderConfirmationPanels({ email, shippingAddr, shippingMethod, loggedIn, items = [], freeOrder }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelled,     setCancelled]     = useState(false);
  /* Nothing is printed on a digital-only order, so there is nothing to stop and — as
     the paragraph below already says — nothing to refund. The control goes rather than
     opening a dialog that would offer to cancel a file the buyer already has. */
  const digitalOnly = items.length > 0 && items.every(isPdf);
  const cancelWindowOpen = CANCEL_WINDOW_OPEN && !cancelled && !digitalOnly;

  /* Cancelling stops the print and refunds it. A PDF is already downloadable, so
     it isn't refunded and isn't taken away — the refund is the order minus any
     digital lines, derived from the cart rather than written down. */
  const hasPdf  = items.some(isPdf);
  const refund  = items.filter(it => !isPdf(it)).reduce((s, it) => s + lineTotal(it), 0);
  const money2  = n => `$${n.toFixed(2)}`;

  const [acctEmail,      setAcctEmail]      = useState(email || "");
  const [acctPw,         setAcctPw]         = useState("");
  const [showAcctPw,     setShowAcctPw]     = useState(false);
  /* Marketing consent starts unchecked, always. A pre-ticked opt-in isn't consent —
     it's a choice the customer never made, and the label says "Yes, send me…" on
     their behalf. Both panels in CheckoutLinkApp.jsx already default to false; keep
     all three in step. */
  const [marketing,      setMarketing]      = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [acctErrors,     setAcctErrors]     = useState({});

  const METHOD_MAP = { economy:"Economy", standard:"Standard", express:"Express" };
  const ARRIVE_MAP = { economy:"May 30",  standard:"May 24",   express:"May 21"  };
  const methodLabel = METHOD_MAP[shippingMethod] || "Economy";
  const arriveDate  = ARRIVE_MAP[shippingMethod] || "May 30";

  const handleCreateAccount = () => {
    const e = {};
    if (!acctEmail || !acctEmail.includes("@")) e.email = "Enter a valid email address.";
    // Empty and too-short are different problems, so they get different messages.
    // The too-short one repeats the hint verbatim — someone who just failed
    // shouldn't have to look elsewhere to find the rule.
    if (!acctPw)                                e.pw    = "Enter a password.";
    else if (acctPw.length < 6)                 e.pw    = "Use at least 6 characters.";
    if (Object.keys(e).length) return setAcctErrors(e);
    setAcctErrors({});
    setAccountCreated(true);
  };

  /* ── Demo auto-fill ── */
  const fillDemoAcct = () => { if (!acctPw) { setAcctPw("Demo1234"); setAcctErrors({}); } };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Confirming is destructive and irreversible, so it asks first. The dismiss
          is "Keep order", never "Cancel" — two cancels in a cancellation dialog
          leaves nobody sure which one backs out. */}
      <ConfirmCancelDialog
        open={confirmCancel}
        refund={money2(refund)}
        hasPdf={hasPdf}
        freeOrder={freeOrder}
        onKeep={() => setConfirmCancel(false)}
        onCancelOrder={() => { setConfirmCancel(false); setCancelled(true); }}
      />

      {/* Panel 1 — Order complete, or the cancelled receipt */}
      <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          {/* No tick on a cancellation — a success mark reads as congratulations */}
          {!cancelled && <IconCheckCircle size={24} />}
          <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>
            {cancelled ? "Order canceled" : "Your order is complete"}
          </span>
        </div>
        <Divider />
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16 }}>
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
            {cancelled ? "We've emailed your cancellation to " : "A confirmation email has been sent to "}
            <strong style={{color:T.textBold}}>{email || "name@email.com"}</strong>.
            If you don't see it, check your spam or bulk folder.
          </p>
          <p style={{ fontSize:15, color:T.textBold }}>
            Order number:{" "}
            <a href="#" style={{ color:T.textLink, fontWeight:700, textDecoration:"none" }}>11234454</a>
          </p>
          {/* Nothing is shipping once the order is cancelled, so the delivery block
              goes rather than describing a book that won't arrive. */}
          {/* A digital order has no address and no arrival date. What replaces them is
              the one thing the buyer wants to know — the file is ready, and where the
              link is — rather than a delivery block with every field empty. */}
          {!cancelled && digitalOnly && (
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:4 }}>Your download</p>
            <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
              Your PDF is ready to download now. The link is in the confirmation email.
            </p>
          </div>
          )}
          {/* ── Two headings, two ideas ──
              This was one block headed "Shipping to:" whose next line was
              "Method: Economy" — the heading promised an address and then gave a
              delivery service. Split so each heading is followed by the thing it
              names. "Method:" is also gone: a colon-suffixed field label is how a
              form asks a question, not how a receipt reports an answer. */}
          {!cancelled && !digitalOnly && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:4 }}>Shipping to</p>
              {/* Prints the whole address, not just name and country. This block exists so
                  someone can check where their order is going, and it couldn't do that
                  without the street and city. Optional lines are omitted when empty rather
                  than left as blanks; state and postcode share a line the way an address
                  is actually written. */}
              {shippingAddr && (
                <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
                  <div>{shippingAddr.firstName} {shippingAddr.lastName}</div>
                  {shippingAddr.company && <div>{shippingAddr.company}</div>}
                  {shippingAddr.address && <div>{shippingAddr.address}</div>}
                  {shippingAddr.address2 && <div>{shippingAddr.address2}</div>}
                  <div>
                    {[shippingAddr.city, shippingAddr.state].filter(Boolean).join(", ")}
                    {shippingAddr.zip ? ` ${shippingAddr.zip}` : ""}
                  </div>
                  <div>{shippingAddr.country}</div>
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:T.textBold, marginBottom:4 }}>Delivery</p>
              <div style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
                {methodLabel} · Arrives by {arriveDate}
              </div>
            </div>
          </div>
          )}
          {/* The guest order portal isn't being built, so cancelling has to be
              reachable from here. Once the window closes the control is removed
              rather than disabled — it can't reopen, so a dead button would only
              invite clicking; the sentence carries the explanation instead. */}
          {cancelled ? (
            <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
              {freeOrder
                ? "Nothing was charged for this order, so there's no refund to make."
                : <>We've refunded <strong style={{ color:T.textBold }}>{money2(refund)}</strong> to the
                  card you used. Refunds take 3–5 business days.</>}
              {hasPdf && " Your PDF isn't refundable and stays available to download."}
            </p>
          ) : (
          <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
            {cancelWindowOpen
              ? "You can cancel this order within about three hours of placing it. "
              : "The three-hour window to cancel this order has passed. "}
            Read our{" "}
            <a href="#" target="_blank" rel="noopener noreferrer"
              style={{ color:T.textLink, textDecoration:"underline" }}>FAQ</a>{" "}
            {/* PDFs only — Blurb doesn't sell ebooks, and naming a product we don't
                offer invites a question the page can't answer. */}
            for details (opens in a new tab). Blurb doesn't offer returns or refunds on
            PDF orders.
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
        </div>
      </div>

      {/* Panel 2 — Account creation form → success confirmation (guest flow only) */}
      {!loggedIn && (
      <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24 }}>
        {accountCreated ? (
          /* ── Account created confirmation ── */
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <IconCheckCircle size={24} />
              <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Account created</span>
            </div>
            <Divider />
            <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.6 }}>
              Your account has been created for{" "}
              <strong style={{color:T.textBold}}>{acctEmail}</strong>.
              You can now sign in to track your order, reorder books, and manage your projects.
            </p>
            <div>
              <Btn>Sign in to your account</Btn>
            </div>
          </div>
        ) : (
          /* ── Account creation form ── */
          <>
            <p style={{ fontSize:18, fontWeight:700, color:T.textBold, marginBottom:8 }}>Save order details for next time</p>
            <p style={{ fontSize:14, color:T.textSubtle, marginBottom:16, lineHeight:1.5 }}>
              Create a free account to track your order, reorder books, and manage your projects
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Email address" required placeholder="name@example.com" type="email"
                  value={acctEmail} onChange={v => { setAcctEmail(v); setAcctErrors({}); }}
                  error={acctErrors.email} />
                <Input label="Password" required placeholder="Create a password"
                  type={showAcctPw ? "text" : "password"}
                  value={acctPw} onChange={v => { setAcctPw(v); setAcctErrors({}); }}
                  hint="Use at least 6 characters."
                  error={acctErrors.pw}
                  onClick={fillDemoAcct}
                  rightIcon={
                    <button onClick={() => setShowAcctPw(s => !s)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <IconVisibility size={18} on={showAcctPw} />
                    </button>
                  }
                />
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, color:T.textBold }}>
                <input type="checkbox" checked={marketing} onChange={() => setMarketing(m => !m)} style={{ accentColor:T.brand, width:16, height:16 }} />
                Yes, send me book-making tips, design inspiration, and exclusive offers.
              </label>
              <div>
                <Btn onClick={handleCreateAccount}>Create free account</Btn>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}

/* ── Mobile bottom tray: collapsed total bar that expands into the full summary ── */
function MobileSummaryTray({ summaryProps, total }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      {/* Scrim behind the expanded sheet */}
      <div
        onClick={() => setExpanded(false)}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:90,
          opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none", transition:"opacity .25s" }}
      />
      <div style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:100, background:T.surface,
        borderTopLeftRadius:16, borderTopRightRadius:16, boxShadow:"0 -2px 16px rgba(0,0,0,.15)",
        display:"flex", flexDirection:"column", maxHeight:"88vh" }}>
        {/* Drag handle — toggles expand/collapse */}
        <button onClick={() => setExpanded(e => !e)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 0 6px", width:"100%", flexShrink:0 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"#ccc", margin:"0 auto" }} />
        </button>

        {/* Collapsed bar */}
        <div style={{ display: expanded ? "none" : "flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"2px 20px 16px" }}>
          <button onClick={() => setExpanded(true)}
            style={{ background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left" }}>
            <span style={{ fontSize:13, color:T.textSubtle, display:"flex", alignItems:"center", gap:2 }}>
              Order summary <IconExpandLess size={18} />
            </span>
            <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>${total.toFixed(2)}</span>
          </button>
          {!summaryProps.orderPlaced && (
            <Btn onClick={summaryProps.paymentDone ? summaryProps.onPlaceOrder : undefined} disabled={!summaryProps.paymentDone}>
              Place order
            </Btn>
          )}
        </div>

        {/* Expanded full summary — kept mounted (display toggled) so the total stays live */}
        <div style={{ display: expanded ? "block" : "none", overflowY:"auto", padding:"0 16px 20px" }}>
          <OrderSummary {...summaryProps} />
        </div>
      </div>
    </>
  );
}

/* ── Responsive checkout layout ── */
function CheckoutLayout({ children, summaryProps, onCartClick, demoNav }) {
  const { isMobile, isDesktop } = useViewport();
  const [liveTotal, setLiveTotal] = useState(235);
  const summaryWithTotal = { ...summaryProps, onTotalChange:setLiveTotal };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <DemoBanner demoNav={demoNav} />
      <Header />
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding: isMobile ? "0 20px 40px" : "0 40px 60px", maxWidth:1210, margin:"0 auto", width:"100%", alignSelf:"center" }}>
        {/* Back to cart — below header, left-aligned */}
        <button
          onClick={onCartClick}
          style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:"16px 0", alignSelf:"flex-start" }}
        >
          <IconCart size={24} />
          <span style={{ fontSize:14, fontWeight:600, color:T.textLink, textDecoration:"underline" }}>Back to cart</span>
        </button>

        {/* Columns: side-by-side on desktop, stacked on tablet/mobile */}
        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexDirection: isDesktop ? "row" : "column" }}>
          <div style={{ flex: isDesktop ? "1 1 520px" : undefined, width: isDesktop ? "auto" : "100%", maxWidth: isDesktop ? 730 : "100%", display:"flex", flexDirection:"column", gap:14 }}>
            {children}
          </div>
          {/* Inline summary on desktop (sticky 380px) and tablet (full width); hidden on mobile */}
          {!isMobile && (
            <div style={{ flexShrink:0, width: isDesktop ? 380 : "100%", position: isDesktop ? "sticky" : "static", top:20 }}>
              <OrderSummary {...summaryWithTotal} />
            </div>
          )}
        </div>
      </div>
      <Footer />
      {/* Spacer so the fixed tray doesn't cover the footer on mobile — matches the
          collapsed tray height (20px handle + ~44px bar row + 16px bottom padding) */}
      {isMobile && <div style={{ height:80, flexShrink:0 }} />}
      {/* Mobile: expandable bottom tray */}
      {isMobile && <MobileSummaryTray summaryProps={summaryWithTotal} total={liveTotal} />}
    </div>
  );
}

/* ── Work-in-progress marker ──
   `main` is the approved build; anything else is WIP. The branch comes from
   vite.config.js at build time (Vercel's VERCEL_GIT_COMMIT_REF, or the local git
   branch), so the two Vercel projects need no per-project configuration.

   Why in the app and not just a separate URL: a URL doesn't survive being
   screenshotted into a deck. Yesterday's presentation already put these screens
   in front of the team, so the artifact itself has to say it isn't approved. */
const BRANCH = typeof __BRANCH__ === "string" ? __BRANCH__ : "unknown";
const IS_WIP = BRANCH !== "main";

/* An outline chip rather than the solid dark-amber fill it started as. A saturated
   block pulled the eye on every screen, and this marker only has to be *found* when
   someone asks "is this approved?" — it doesn't have to interrupt. The same brown
   is still here as the ink, so it stays recognisably a caution and still survives
   being screenshotted into a deck, which is the only reason it exists.
   Mirrored in CheckoutLinkApp.jsx — keep the three values in step. */
const WIP_INK    = "#7a3d00";
const WIP_BG     = "#fbf3e6";
const WIP_BORDER = "#e0c79c";

/* Rides inside the demo banner instead of taking a full row above it — two
   stacked bars were more chrome than the screen below them could afford.

   The second sentence ("use the production link") moves to the tooltip: what has
   to read at a glance is that this build isn't approved.

   Mirrors WipChip in CheckoutLinkApp.jsx — keep the two in step. */
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

/* ═══════════════════════════ DEMO NAV ═══════════════════════════
   Three fixed zones — identity, navigation, settings — matching the Checkout Link
   fork's bar. The single dropdown this replaces mixed two different things in one
   list: `Add to cart` / `Cart` are stops on the journey, while `first-time user` /
   `returning user` are the same stop under a different identity. Reading the flow
   off it meant knowing which was which.

   Now the stepper walks the journey and the identity is a scenario setting, so the
   list of screens is a list of screens.

   Duplicated from CheckoutLinkApp.jsx rather than shared, per this file's
   convention of carrying its own primitives — keep the two in step. */
const REGULAR_STAGES = [
  { key:"addtocart", short:"Add to cart",  label:"Add to cart" },
  { key:"cart",      short:"Cart",         label:"Cart" },
  { key:"checkout",  short:"Checkout",     label:"Checkout" },
  { key:"confirm",   short:"Confirmation", label:"Order confirmation" },
];

const DEMO_SELECT = { fontSize:12, fontWeight:600, color:T.textBold, background:T.surface,
  border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"4px 8px", cursor:"pointer" };

/* 28px square, matching the height of the selects beside it */
const demoIconBtn = on => ({ display:"inline-flex", alignItems:"center", justifyContent:"center",
  position:"relative", width:28, height:28, padding:0, flexShrink:0, cursor:"pointer",
  background: on ? T.brand : T.surface, borderRadius:T.radius,
  border:`1px solid ${on ? T.brand : T.border}` });

/* NAVIGATION ZONE — one bordered track with chevrons between stops, so the linear
   Add to cart → Confirmation journey is visible in the control that walks it. It
   scrolls rather than wraps: a stepper broken across two lines stops reading as an
   order of events. */
function StageStepper({ stage, onJump }) {
  return (
    /* Takes the space the two zones don't and centres itself in it, rather than
       sitting wherever the identity zone happens to end. */
    <div style={{ flex:"1 1 auto", minWidth:0, overflowX:"auto", display:"flex", justifyContent:"center" }}>
      <div style={{ display:"flex", alignItems:"center", flexShrink:0, padding:2, gap:2,
        background:T.surface, border:`1px solid ${T.borderSubtle}`, borderRadius:T.radius }}>
        {REGULAR_STAGES.map((s, i) => {
          const active = stage === s.key;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <span className="ms" style={{ fontSize:14, color:T.borderSubtle, flexShrink:0 }}>chevron_right</span>}
              <button onClick={() => onJump(s.key)} aria-current={active ? "step" : undefined} title={s.label}
                style={{ flexShrink:0, whiteSpace:"nowrap", border:"none", borderRadius:2,
                  background: active ? T.brand : "transparent", color: active ? "#fff" : T.textBold,
                  padding:"3px 8px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
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

const PANEL_W = 248;

/* SETTINGS ZONE — who is shopping describes the *situation* being demoed, not the
   screen being viewed, so it sits behind one button instead of in the list of
   screens. The gear carries a dot when it's off its default, because otherwise a
   screenshot of the guest flow looks identical to the signed-in one. */
function DemoSettings({ userType, onUserTypeChange, expressStyle, onExpressStyleChange, expressApplies }) {
  const [open, setOpen] = useState(false);
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

  const modified = userType !== "returning" || expressStyle !== "single";

  return (
    <span ref={ref} style={{ display:"inline-flex" }}>
      <button ref={btnRef} onClick={() => { if (!open) place(); setOpen(o => !o); }}
        aria-expanded={open} aria-label="Demo settings" title="Demo settings — who's shopping, express treatment"
        style={demoIconBtn(open)}>
        <span className="ms" style={{ fontSize:16, color: open ? "#fff" : T.textSubtle }}>tune</span>
        {modified && !open && (
          <span style={{ position:"absolute", top:-2, right:-2, width:8, height:8, borderRadius:"50%",
            background:T.brand, border:"1px solid #f0f0f0" }} />
        )}
      </button>
      {open && (
        <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:110, width:PANEL_W,
          background:T.surface, border:`1px solid ${T.borderSubtle}`, borderRadius:T.radius,
          boxShadow:"0 4px 14px rgba(20,20,20,.18)", padding:12, textAlign:"left",
          display:"flex", flexDirection:"column", gap:12 }}>
          <SettingRow label="Who's shopping"
            hint="Changing it restarts the checkout under the new identity. The cart pages are the same either way.">
            <select value={userType} onChange={e => onUserTypeChange(e.target.value)}
              aria-label="Shopper identity" style={{ ...DEMO_SELECT, width:"100%" }}>
              <option value="returning">Returning — signed in, saved addresses</option>
              <option value="new">First-time — guest, nothing saved</option>
            </select>
          </SettingRow>
          {/* Shown disabled rather than hidden away from the cart: hiding a control
              is what made the old bar insert one mid-list, and disabled it also
              says where the setting has an effect. */}
          <SettingRow label="Express treatment"
            hint={expressApplies
              ? "The two express treatments on the cart, the same pair the Checkout Link demo compares."
              : "Only the cart offers express wallets — the checkout's own express row is a separate step."}>
            <select value={expressStyle} onChange={e => onExpressStyleChange(e.target.value)}
              disabled={!expressApplies} aria-label="Express checkout button treatment"
              style={{ ...DEMO_SELECT, width:"100%",
                ...(!expressApplies && { color:T.textDisabled, background:T.bg, cursor:"not-allowed" }) }}>
              {Object.entries(EXPRESS_STYLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </SettingRow>
          <p style={{ margin:0, paddingTop:10, borderTop:`1px solid ${T.borderSubtle}`,
            fontSize:11, lineHeight:1.5, color:T.textDisabled }}>
            Click any form field to auto-fill it with sample data.
          </p>
          {/* The free-order case is reached by applying a code, not by flipping a
              setting — so the codes are listed where the other demo affordances are
              explained rather than hidden in the source. */}
          <p style={{ margin:0, fontSize:11, lineHeight:1.5, color:T.textDisabled }}>
            Promo codes: <strong>BLURB10</strong>, <strong>SAVE20</strong>, <strong>BULK50</strong> —
            or <strong>ALLFREE</strong> for a $0 order with free shipping, which drops the payment step.
          </p>
        </div>
      )}
    </span>
  );
}

/* IDENTITY ZONE — which prototype, not which screen; the stepper handles screens.
   Mirrors FlowSwitcher in CheckoutLinkApp.jsx — keep the options in step. */
function FlowSwitcher({ onSwitchPrototype }) {
  if (!onSwitchPrototype)
    return <strong style={{ fontSize:12, color:T.textBold }}>Regular flow</strong>;
  return (
    <select value="regular" onChange={e => onSwitchPrototype(e.target.value)} aria-label="Switch prototype"
      title="Switch to another prototype in this build" style={DEMO_SELECT}>
      <option value="regular">Regular flow</option>
      <option value="checkout-link">Checkout Link demo</option>
    </select>
  );
}

/* Shared by the checkout layout and the Add to Cart / Cart pages, so there's one
   nav, in one place, on every screen. */
function DemoBanner({ demoNav }) {
  /* Collapsing hides the controls but never the WIP chip — the marker has to be on
     every screen, and "clean screenshot" can't be allowed to mean "screenshot with
     no sign it's unapproved". On `main` there's no chip, so all that's left is the
     restore button. */
  const [hidden, setHidden] = useState(false);
  const nav = demoNav || {};

  const bar = { background:"#f0f0f0", borderBottom:"1px solid #e0e0e0", padding:"6px 12px",
    display:"flex", alignItems:"center", flexWrap:"wrap", gap:12, fontSize:13, color:T.textSubtle,
    flexShrink:0 };

  if (hidden) return (
    <div style={{ ...bar, justifyContent: IS_WIP ? "space-between" : "flex-end", padding:"4px 12px" }}>
      <WipChip />
      <button onClick={() => setHidden(false)} aria-label="Show demo controls" title="Show demo controls"
        style={demoIconBtn(false)}>
        <span className="ms" style={{ fontSize:16, color:T.textSubtle }}>visibility</span>
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
        <FlowSwitcher onSwitchPrototype={nav.onSwitchPrototype} />
      </div>
      {nav.onJump && <StageStepper stage={nav.stage} onJump={nav.onJump} />}
      <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
        {nav.onUserTypeChange && (
          <DemoSettings userType={nav.userType} onUserTypeChange={nav.onUserTypeChange}
            expressStyle={nav.expressStyle} onExpressStyleChange={nav.onExpressStyleChange}
            expressApplies={nav.stage === "cart"} />
        )}
        <button onClick={() => setHidden(true)} aria-label="Hide demo controls"
          title="Hide demo controls — for screenshots" style={demoIconBtn(false)}>
          <span className="ms" style={{ fontSize:16, color:T.textSubtle }}>visibility_off</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ ADD TO CART + CART ═══════════════════════════
   The two pages that precede the single-page checkout in the REGULAR flow (not
   Checkout Links). Ported from Figma "Single-page Checkout" → section
   `Cart and Add to Cart (07/31/26)`: Add to Cart 12442:88283, Cart 12442:88852
   / 88949 / 89006 / 89368. Reuses this file's tokens and primitives rather than
   duplicating them the way CheckoutLinkApp.jsx had to. */

const UNIT_PRICE = 35.00;
const PDF_PRICE  = 5.00;
const PDF_SIZE   = "12 MB";
const GIFT_PRICE = 7.99;

/* What Add to Cart opens on when it isn't restoring a cart line's settings */
const ATC_DEFAULTS = {
  qty:1, gift:false, format:"print",
  paper:"Premium Matte", endsheet:"Standard White  $0.00", finish:"Matte laminate  $0.00",
  logoPage:"Include  $0.00",
};

/* Option values carry their price ("Matte laminate  $0.00"); the cart row wants
   the name on its own. */
const optLabel = v => v.split(/\s{2,}\$|\s\+\$/)[0].trim();

/* Covers are portrait 4:5 and the wireframe's square crop cut the title off the
   jacket, so thumbnails set a width and let the height follow the artwork. */
const coverThumb = w => ({ width:w, height:"auto", objectFit:"contain", borderRadius:3, flexShrink:0, display:"block" });

/* The same book the PDP sells, so the regular flow and the Checkout Link fork
   demo one product rather than two unrelated ones. Kept in step with
   CheckoutLinkApp's PRODUCT by hand — the two files don't share constants. */
const BOOK_SEED = {
  title:"Pride and Preconceptions", author:"Paige Hazelwood", type:"Photo Book",
  options:"Standard Landscape, 10×8 in (25×20 cm)", pages:20,
  binding:"Hardcover, ImageWrap",
  spec:"Premium Paper, matte finish",
  img:"/assets/book-pride.png",
};

/* ── Format: what the buyer is choosing between, not an add-on ──
   Print and PDF are separate products, so Add to Cart opens with a choice
   between them rather than a tick-box hanging off the print order. The bundle
   is the plain sum of the parts — no discount — so nothing here has to explain
   a saving. Mirrors CheckoutLinkApp's FORMATS; keep the two in step. */
const FORMATS = [
  { id:"print",   label:"Printed",       price:UNIT_PRICE,             blurb:"Ships in 5–7 days" },
  { id:"digital", label:"PDF",           price:PDF_PRICE,              blurb:"Instant download" },
  { id:"both",    label:"Printed + PDF", price:UNIT_PRICE + PDF_PRICE, blurb:"PDF now, book in 5–7 days" },
];
const hasPrint   = f => f === "print" || f === "both";
const hasDigital = f => f === "digital" || f === "both";

/* The PDF is its own line item, not an add-on ticked inside the book's row
   (Figma 12442:88949). It carries the project's identity — same cover, same
   title with "(PDF)" appended — because in the cart it has to be recognisable
   as *that* project, not a generic file. Quantity is fixed at 1: one download
   serves any number of printed copies. */
const pdfLineFor = book => ({
  id: `${book.id}-pdf`, kind:"pdf", projectId:book.id,
  title:`${book.title} (PDF)`, author:book.author,
  type:"Digital PDF", options:"PDF, optimized for digital viewing",
  size:PDF_SIZE, img:book.img,
});

/* One project in both formats, so a direct jump to the Cart shows the same two
   row types that adding Print + PDF produces */
const CART_SEED = (() => {
  const a = { ...BOOK_SEED, id:"a", kind:"book", qty:1 };
  return [a, pdfLineFor(a)];
})();

const isPdf = it => it.kind === "pdf";
/* The gift box is one box for the line, not one per copy — same as the way Add
   to Cart prices it — so it doesn't multiply with the quantity. */
const lineTotal = it => isPdf(it) ? PDF_PRICE : it.qty * UNIT_PRICE + (it.gift ? GIFT_PRICE : 0);
const cartTotal = items => items.reduce((s, it) => s + lineTotal(it), 0);
/* Printed copies only — the volume tier is about what gets printed, and a PDF
   nudging the count toward "10+ units" would misstate the discount. */
const cartUnits = items => items.reduce((s, it) => s + (isPdf(it) ? 0 : it.qty), 0);

/* Dark promo bar above both pages. Threshold copy is data-driven so the volume
   tier isn't hardcoded into a sentence — see the 20%-vs-25% question on CXKB-513. */
const VOLUME_TIER = { minUnits: 10, percent: 20 };

/* Hidden while the volume-discount offer is unsettled — flip to true to bring
   the bar back rather than re-deriving its copy and colour from scratch. */
const SHOW_PROMO_BANNER = false;

function PromoBanner() {
  if (!SHOW_PROMO_BANNER) return null;
  return (
    <div style={{ background:"#2d3942", padding:"12px 20px", display:"flex", alignItems:"center",
      justifyContent:"center", gap:8, flexWrap:"wrap", flexShrink:0 }}>
      <span style={{ fontSize:16, fontWeight:500, color:"#fff", lineHeight:"24px" }}>
        Volume discounts available — {VOLUME_TIER.percent}% off at {VOLUME_TIER.minUnits}+ copies
      </span>
      <a href="#" onClick={e => e.preventDefault()}
        style={{ fontSize:16, fontWeight:500, color:"#fff", textDecoration:"underline" }}>Learn more</a>
    </div>
  );
}

/* Third of the same kind: the Logo page choice on Add to Cart. Its removal fee
   was never confirmed, so the control is hidden rather than shipped with an
   invented price. logoPage stays at its "Include  $0.00" default meanwhile, so
   nothing downstream changes. */
const SHOW_LOGO_PAGE_OPTION = false;

/* Whether this is the buyer's first order of this book. A scenario constant
   rather than a demo control: the other half of the rule is the quantity, which
   is already changeable on screen, so one flag covers the repeat-order case. */
const IS_FIRST_ORDER = true;

/* Only on a first order of more than one printed copy. The risk it guards
   against is printing a stack of a book nobody has held yet — a single copy is
   already the proof, and a repeat order has been seen in print. Anchored under
   the quantity because that's the choice it's reacting to. */
function ProofCopyNote({ units }) {
  if (!IS_FIRST_ORDER || units < 2) return null;
  return (
    <Alert type="info"
      message="Since this is your first order for this book, we highly recommend ordering a single proof copy, first." />
  );
}

/* Shared page chrome for both pages — promo bar, title, and a two-column body
   that stacks below 1024px. */
function ShopLayout({ title, children, aside, demoNav }) {
  const { isDesktop } = useViewport();
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <DemoBanner demoNav={demoNav} />
      <Header />
      <PromoBanner />
      <div style={{ flex:1, width:"100%", display:"flex", justifyContent:"center",
        padding: isDesktop ? "16px 112px 40px" : "20px 20px 40px" }}>
        <div style={{ flex:1, minWidth:0, maxWidth:1300, display:"flex", flexDirection:"column", gap:16 }}>
        <h1 style={{ fontSize:24, fontWeight:500, lineHeight:1.2, color:T.textBold }}>{title}</h1>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexDirection: isDesktop ? "row" : "column" }}>
          <div style={{ flex: isDesktop ? "1 1 740px" : undefined, width: isDesktop ? "auto" : "100%",
            display:"flex", flexDirection:"column", gap:16 }}>
            {children}
          </div>
          {/* 411px, not 380 — the wireframe's right panel (12442:88348) is 411 against
              a 789 left panel inside the 1216 body group. */}
          <div style={{ flexShrink:0, width: isDesktop ? 411 : "100%",
            position: isDesktop ? "sticky" : "static", top:20 }}>
            {aside}
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* Order summary used by both pages. The CTA label differs per page — on the Cart
   wireframe it currently reads "Add to cart" because both pages share one Figma
   component; that's a bug in the design, not something to reproduce. */
function ShopSummary({ subtotal, cta, onCta, ctaDisabled, units, lines, express }) {
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24,
      display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:18, fontWeight:700, color:T.textBold }}>Order summary</span>
        <span style={{ fontSize:14, color:T.textBold }}>Prices in USD</span>
      </div>
      {/* Itemised on Add to Cart, where the format chooser can put two products
         in one order and the PDF would otherwise be invisible — nothing on the
         left of the page represents it, because there is nothing to configure.
         The Cart passes no lines: the rows themselves are the itemisation. */}
      {lines && lines.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {lines.map(l => (
            <div key={l.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <span style={{ minWidth:0, display:"flex", flexDirection:"column", gap:2 }}>
                <span style={{ fontSize:14, fontWeight:600, color:T.textBold }}>{l.name}</span>
                {l.desc && <span style={{ fontSize:13, color:T.textSubtle, lineHeight:1.4 }}>{l.desc}</span>}
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:T.textBold, whiteSpace:"nowrap" }}>
                ${l.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        borderTop: lines && lines.length ? `1px solid ${T.border}` : undefined,
        paddingTop: lines && lines.length ? 12 : undefined,
        borderBottom:`1px solid ${T.border}`, paddingBottom:12 }}>
        <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>Subtotal</span>
        <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>${subtotal.toFixed(2)}</span>
      </div>
      <p style={{ fontSize:14, color:T.textSubtle, lineHeight:1.5 }}>
        Tax and <a href="#" onClick={e => e.preventDefault()} style={{ color:T.textLink, fontWeight:600, textDecoration:"underline" }}>shipping</a> are
        calculated at checkout, where you can also add a promo code. Promo codes can't be combined with volume discounts.
      </p>
      <Btn onClick={onCta} disabled={ctaDisabled} fullWidth>
        <IconCart size={24} color={ctaDisabled ? T.textDisabled : "#fff"} /> {cta}
      </Btn>
      {/* Wallets sit directly under the checkout button, as they do in the
          Checkout Link cart drawer, so an impulse buy never has to enter the
          checkout at all. No card link beside them — the button above already is
          that route. */}
      {express}
    </div>
  );
}

/* ── Add to Cart ── */
/* Opened cold this is a fresh configuration; opened from the cart's "Edit
   options" it is handed that line's own settings, so the buyer lands back on
   the choices they made rather than on the defaults. */
function AddToCartPage({ onAdded, config, demoNav }) {
  const c = config || ATC_DEFAULTS;
  const { isDesktop } = useViewport();
  const [qty, setQty]   = useState(c.qty);
  const [paper, setPaper]   = useState(c.paper);
  const [endsheet, setEnd]  = useState(c.endsheet);
  const [finish, setFinish] = useState(c.finish);
  const [logoPage, setLogoPage] = useState(c.logoPage);
  const [gift, setGift]     = useState(c.gift);
  const [format, setFormat] = useState(c.format);
  const [giftPreview, setGiftPreview] = useState(false);
  const item = CART_SEED[0];
  /* Everything below the format chooser configures the printed copy, so a
     PDF-only order drops it — see the comment on the options block. */
  const printing = hasPrint(format);
  const printQty = printing ? qty : 0;
  const subtotal = printQty * UNIT_PRICE
    + (printing && gift ? GIFT_PRICE : 0)
    + (hasDigital(format) ? PDF_PRICE : 0);

  /* One entry per thing being bought, in the order they'd appear in the cart.
     Names and prices only: what each format is and how it arrives is already
     said once on the left, under the chip that selects it, and repeating it here
     made the same sentence appear twice on one screen. Quantity is the exception
     — it lives nowhere else in the summary. */
  const lines = [
    /* The chips compare formats ("Print" against "PDF"); the summary lists what
       is being bought, where the object reads better than the format. */
    printing && { name:"Printed book", desc:`Qty ${qty}`, price: printQty * UNIT_PRICE },
    printing && gift && { name:"Gift box", price: GIFT_PRICE },
    hasDigital(format) && { name:"PDF", price: PDF_PRICE },
  ].filter(Boolean);

  return (
    <ShopLayout title="Add to cart" demoNav={demoNav}
      aside={<ShopSummary subtotal={subtotal} units={printQty} cta="Add to cart" lines={lines}
        onCta={() => onAdded({ qty, gift: printing && gift, format,
          paper, endsheet, finish, logoPage,
          /* What was picked here is what the cart row then reports, so
             Cart → Edit options → Add to cart is a round trip that shows. */
          spec: [paper, finish, endsheet, ...(logoPage.startsWith("Remove") ? ["No logo page"] : [])]
            .map(optLabel).join(", ") })} />}>
      <GiftBoxModal open={giftPreview} added={gift} onClose={() => setGiftPreview(false)}
        onAdd={() => { setGift(true); setGiftPreview(false); }} />
      <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:24,
        display:"flex", flexDirection:"column", gap:16 }}>
        <FormatSelector value={format} onChange={setFormat} />
        <Divider />
        {/* Product row — thumbnail + spec on the left, quantity pinned right (11854:33599
            is space-between, so the stepper holds the right edge instead of trailing the
            spec text). The spec column is the wireframe's 238px; the thumbnail 140². */}
        <div style={{ display:"flex", gap:24, alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:24, alignItems:"flex-start", flex:"1 1 400px", minWidth:0 }}>
            <img src={item.img} alt="" style={coverThumb(140)} />
            <div style={{ flex:"1 1 238px", minWidth:0, display:"flex", flexDirection:"column", gap:4,
              fontSize:14, lineHeight:1.4, color:T.textBold }}>
              <div><strong>Title:</strong> {item.title}</div>
              <div><strong>Author:</strong> {item.author}</div>
              <div><strong>Project type:</strong> {item.type}</div>
              <div><strong>Project options:</strong> {item.options}</div>
              <div><strong># of pages:</strong> {item.pages}</div>
            </div>
          </div>
          <div style={{ width:160, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
            <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px",
              color: printing ? T.textBold : T.textDisabled }}>Quantity</span>
            {printing
              ? <QtyStepper qty={qty} setQty={setQty} min={1} />
              /* A PDF is one file however many copies you'd have printed, so the
                 stepper is replaced by the fact rather than greyed out — there is
                 nothing here to step. */
              : <span style={{ fontSize:16, color:T.textSubtle, lineHeight:"40px" }}>1 file</span>}
          </div>
        </div>

        {/* Anchored to the quantity that triggers it */}
        <ProofCopyNote units={printQty} />
        {/* CXKB-513 message, anchored to the quantity that triggers it */}

        {/* Everything below configures the printed copy, so a PDF-only order drops
            it rather than greying it out — a screen of dead controls is a worse
            read than a short page, and the format chips above say plainly what
            switching back would restore. */}
        {printing && (
          <>
            <Divider />

            {/* The options row and the gift-box card are one 24px-gap group (11854:35958),
                set apart from the product row above the divider. */}
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            {/* Options — the binding thumbnail and its caption are one column with a 24px
                gap (11854:33621), not a caption tucked under the image. */}
            <div style={{ display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", gap:24 }}>
                <img src={PRODUCT_MATERIAL_IMG} alt="" style={{ width:100, height:100,
                  objectFit:"cover", borderRadius:T.radius, display:"block" }} />
                <div style={{ width:238, maxWidth:"100%", display:"flex", flexDirection:"column", gap:4 }}>
                  <p style={{ fontSize:16, fontWeight:700, lineHeight:1.4, color:T.textBold }}>{item.binding}</p>
                  <p style={{ fontSize:16, lineHeight:1.4, color:T.textBold }}>Full-color image printed directly on the cover</p>
                </div>
              </div>
              {/* ImageWrap prints the cover image straight onto the board, so there
                  is no cover linen to pick — that option belongs to the dust-jacket
                  binding. Dropped rather than replaced: a hardcover ImageWrap has
                  paper, end sheet and cover laminate, and nothing else to choose. */}
              <div style={{ flex:"1 1 320px", minWidth:0, display:"flex", flexDirection:"column", gap:16 }}>
                <SelectInput label="Paper"        value={paper}    onChange={setPaper} options={["Standard","Premium Lustre","Premium Matte","ProLine Uncoated"]} />
                <SelectInput label="Endsheet"     value={endsheet} onChange={setEnd}   options={["Standard White  $0.00","Charcoal (ProLine) +$6.00","Mid-Grey +$6.00"]} />
                <SelectInput label="Cover finish" value={finish}   onChange={setFinish} options={["Gloss laminate  $0.00","Matte laminate  $0.00"]} />
                {/* Hidden until the removal fee is confirmed — the +$4.99 was only
                    ever a placeholder, and a made-up price on screen gets quoted
                    back. Kept rather than deleted: one flag brings it back. */}
                {SHOW_LOGO_PAGE_OPTION && (
                  <SelectInput label="Logo page"    value={logoPage} onChange={setLogoPage} options={["Include  $0.00","Remove  +$4.99"]} />
                )}
              </div>
            </div>

            {/* Gift box — an add-on, so an unticked checkbox card, with a Preview
                link into the detail the card has no room for */}
            <OptionCard checked={gift} onToggle={() => setGift(g => !g)}
              onPreview={() => setGiftPreview(true)}
              img={GIFT_BOX_IMG} title="Gift box"
              desc="Premium packaging for gifting your photo book" price={GIFT_PRICE} />
            </div>
          </>
        )}
      </div>
    </ShopLayout>
  );
}

/* Format chooser. Each card carries a radio as well as the ring, so the choice
   reads two ways: the control says it's a single-choice group, the ring says
   which one. It governs the rest of the page, so it sits above the product row
   and each option carries its own price and its own fulfilment line. That line
   used to sit under the group and describe only the selected card, which meant
   the difference between the three was invisible until you clicked each one.
   Wraps rather than scrolls — three options fit two lines at 375px. */
const SELECTOR_RING = "#292929";

function FormatSelector({ value, onChange }) {
  return (
    <fieldset style={{ border:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:8 }}>
      <legend style={{ fontSize:16, fontWeight:600, color:T.textBold, padding:0, marginBottom:8 }}>Format</legend>
      <div role="radiogroup" style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        {FORMATS.map(f => {
          const on = f.id === value;
          return (
            <button key={f.id} role="radio" aria-checked={on} onClick={() => onChange(f.id)}
              style={{ flex:"1 1 160px", minWidth:0, textAlign:"left", cursor:"pointer",
                background:T.surface, borderRadius:T.radius, padding: on ? "11px 15px" : "12px 16px",
                border: on ? `2px solid ${SELECTOR_RING}` : `1px solid ${T.border}`,
                display:"flex", alignItems:"center", gap:10 }}>
              {/* Decorative: the button already carries role="radio" and aria-checked,
                  so a real input here would announce the choice twice. */}
              <span aria-hidden="true" style={{ flexShrink:0, width:20, height:20, borderRadius:"50%",
                border: `2px solid ${on ? T.brand : "#767676"}`, background:T.surface,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {on && <span style={{ width:10, height:10, borderRadius:"50%", background:T.brand }} />}
              </span>
              <span style={{ display:"flex", flexDirection:"column", gap:2, minWidth:0 }}>
                <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>{f.label}</span>
                <span style={{ fontSize:16, color:T.textBold }}>${f.price.toFixed(2)}</span>
                <span style={{ fontSize:14, color:T.textSubtle, lineHeight:1.4 }}>{f.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* Quantity stepper — shared by both pages. Going below `min` on the Cart calls
   onBelowMin so the row can remove itself. */
function QtyStepper({ qty, setQty, min = 1, onBelowMin }) {
  /* Three equal 48×40 cells, matching the DS Selector component the wireframe uses
     (7870:20025). The middle cell was 52px against 40px buttons, which read as a
     text input wedged between two buttons rather than one control. */
  const cell = {
    width:48, height:40, border:`1px solid ${T.border}`, background:T.surface,
    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:T.textBold,
  };
  const dec = () => { if (qty > min) setQty(qty - 1); else if (onBelowMin) onBelowMin(); };
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      <button onClick={dec} aria-label="Decrease quantity"
        style={{ ...cell, cursor:"pointer", borderRadius:`${T.radius} 0 0 ${T.radius}` }}>−</button>
      <input value={qty} onChange={e => { const v = parseInt(e.target.value.replace(/\D/g,""), 10); setQty(Number.isFinite(v) && v > 0 ? v : min); }}
        aria-label="Quantity"
        style={{ ...cell, borderLeft:"none", borderRight:"none", textAlign:"center", fontSize:18,
          borderRadius:0, padding:0 }} />
      <button onClick={() => setQty(qty + 1)} aria-label="Increase quantity"
        style={{ ...cell, cursor:"pointer", borderRadius:`0 ${T.radius} ${T.radius} 0` }}>+</button>
    </div>
  );
}

/* What the gift box actually is — the card can only afford a line of copy, and
   "Gift box +$5.00" isn't enough to decide on. Opened from the card's Preview
   link and adds the box itself, so the buyer doesn't have to close it and go
   hunting for the checkbox they just read about. */
/* Deliberately says nothing about fit. A size-specific line ("Fits your 10×8 in
   book") raised a question the modal then had to keep answering per size; four
   lines about what the box is are enough to decide on. */
const giftBoxFeatures = [
  "Rigid gift box with magnetic closure",
  "Custom tissue paper wrap with Blurb branding",
  "Satin ribbon pull tab for easy unboxing",
  "Blank gift message card included",
];

function GiftBoxModal({ open, onClose, onAdd, added }) {
  if (!open) return null;
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Gift box"
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:8,
        padding:24, maxWidth:460, width:"100%", maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 8px 40px rgba(0,0,0,.2)", display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <span className="ms" style={{ fontSize:24, color:T.brand }}>redeem</span>
          <h3 style={{ flex:1, minWidth:0, fontSize:20, fontWeight:700, color:T.textBold }}>Gift box</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex" }}>
            <span className="ms" style={{ fontSize:22, color:T.textSubtle }}>close</span>
          </button>
        </div>
        {/* The card's square thumbnail can't be enlarged without cropping the box
            out of its own preview, so the modal uses the landscape shot (Figma
            12900:51211) — it fills the frame with no letterboxing behind it. */}
        <img src={GIFT_BOX_PREVIEW_IMG} alt="" style={{ width:"100%", aspectRatio:"1159 / 825",
          objectFit:"cover", borderRadius:T.radius, display:"block" }} />
        {/* Plain bullets, not ticks — these are what the box is, not a list of
            things already done or confirmed. */}
        <ul style={{ listStyle:"disc", paddingLeft:20, display:"flex", flexDirection:"column", gap:8 }}>
          {giftBoxFeatures.map(f => (
            <li key={f} style={{ fontSize:14, lineHeight:1.5, color:T.textBold }}>{f}</li>
          ))}
        </ul>
        <Divider />
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12 }}>
          <span style={{ fontSize:14, color:T.textSubtle }}>{added ? "Added to your order" : "Add to your order"}</span>
          <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>+${GIFT_PRICE.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          {/* Once it's on the order there is nothing left to do here, so Close
              becomes the only action rather than a button that reads as a status.
              The line above says it's been added. */}
          {added ? <Btn onClick={onClose}>Close</Btn> : (
            <>
              <Btn variant="secondary" onClick={onClose}>Close</Btn>
              <Btn onClick={onAdd}>Add gift box</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Bordered add-on card with a trailing price + checkbox (gift box, PDF version).
   Matches the wireframe's "Checkbox Card / Text" (11854:35944): 100px tall, a square
   78px thumbnail, and an asymmetric 12/16 horizontal padding so the checkbox isn't
   jammed against the border.

   `compact` stacks the label under the thumbnail, which is how the mobile
   wireframe lays it out — four items in one row can't hold their width at 375px. */
function OptionCard({ checked, onToggle, img, title, desc, price, compact, onPreview }) {
  const label = (
    <span style={{ flex: compact ? undefined : 1, minWidth:0, display:"flex", flexDirection:"column",
      gap:4, padding: compact ? 0 : "0 8px" }}>
      <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold }}>{title}</span>
      <span style={{ fontSize:12, fontWeight:600, lineHeight:"16px", color:T.textBold }}>{desc}</span>
      {/* Under the description it reads as more about this thing. The whole card
          is a label, so the click has to stop there — otherwise opening the
          preview would tick the box on the way in. */}
      {onPreview && (
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onPreview(); }}
          aria-label={`Preview ${title.toLowerCase()}`}
          style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0, marginTop:2,
            cursor:"pointer", fontSize:14, fontWeight:600, color:T.textLink, textDecoration:"underline" }}>
          Preview
        </button>
      )}
    </span>
  );
  const priceAndBox = (
    <span style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
      <span style={{ fontSize:16, fontWeight:600, lineHeight:"24px", color:T.textBold, whiteSpace:"nowrap" }}>+${price.toFixed(2)}</span>
      <input type="checkbox" checked={checked} onChange={onToggle}
        style={{ accentColor:T.brand, width:20, height:20, flexShrink:0 }} />
    </span>
  );

  if (compact) return (
    <label style={{ display:"flex", alignItems:"center", gap:12, padding:12, cursor:"pointer",
      border:`1px solid ${T.border}`, borderRadius:T.radius, background:T.surface }}>
      <span style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:8 }}>
        <img src={img} alt="" style={{ width:78, height:78, objectFit:"cover", borderRadius:T.radius }} />
        {label}
      </span>
      {priceAndBox}
    </label>
  );

  return (
    <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
      minHeight:100, padding:"12px 16px 12px 12px", cursor:"pointer",
      border:`1px solid ${T.border}`, borderRadius:T.radius, background:T.surface }}>
      <span style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
        <img src={img} alt="" style={{ width:78, height:78, objectFit:"cover", borderRadius:T.radius, flexShrink:0 }} />
        {label}
      </span>
      {priceAndBox}
    </label>
  );
}

/* ── Cart ── */
function CartPage({ items, setItems, onCheckout, onBrowse, onEdit, onExpressBuy, expressStyle, demoNav }) {
  const wallets = useWallets();
  /* Removal is undoable: the row is replaced in place by a notice holding the
     removed item, so the buyer can put it back without re-configuring it. */
  const [removed, setRemoved] = useState(null);   // { items, index }

  const patch = (id, changes) => setItems(items.map(it => it.id === id ? { ...it, ...changes } : it));
  /* Removing the printed book takes its PDF with it. The PDF is a line of its
     own, but it's a copy of *that* project — leaving it behind stranded a file
     with no book, and the buyer never asked to keep it on its own. Undo puts
     both back together. */
  const remove = id => {
    const index = items.findIndex(it => it.id === id);
    const target = items[index];
    const going = isPdf(target)
      ? [target]
      : items.filter(it => it.id === id || it.projectId === id);
    setRemoved({ items: going, index });
    setItems(items.filter(it => !going.includes(it)));
  };
  const undo = () => {
    const next = items.slice();
    next.splice(Math.min(removed.index, next.length), 0, ...removed.items);
    setItems(next); setRemoved(null);
  };

  const subtotal = cartTotal(items);
  const units    = cartUnits(items);
  const empty    = items.length === 0;

  const notice = removed && (
    <div style={{ background:T.panelBg, borderRadius:T.radius, padding:"10px 14px", display:"flex",
      alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:T.textBold }}>
        <IconInfo size={16} /> {removed.items.length > 1
          ? "Book and its PDF removed from cart."
          : "Item removed from cart."}
      </span>
      <span style={{ display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={undo} style={{ background:"none", border:"none", padding:0, cursor:"pointer",
          display:"flex", alignItems:"center", gap:4, color:T.textLink, fontSize:14, fontWeight:600 }}>
          <span className="ms" style={{ fontSize:18 }}>undo</span>
          <span style={{ textDecoration:"underline" }}>Undo</span>
        </button>
        <button onClick={() => setRemoved(null)} aria-label="Dismiss"
          style={{ background:"none", border:"none", padding:0, cursor:"pointer", display:"flex" }}>
          <span className="ms" style={{ fontSize:18, color:T.textSubtle }}>close</span>
        </button>
      </span>
    </div>
  );

  return (
    <ShopLayout title="Cart" demoNav={demoNav}
      aside={empty ? null : (
        <ShopSummary subtotal={subtotal} units={units}
          cta="Continue to checkout" onCta={onCheckout}
          express={<ExpressBuySection wallets={wallets} style={expressStyle} onPress={onExpressBuy} />} />
      )}>
      {empty ? (
        <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow, padding:"48px 24px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <IconCart size={40} />
          <p style={{ fontSize:24, color:T.textBold }}>Your cart is empty</p>
          <p style={{ fontSize:14, color:T.textSubtle, textAlign:"center", lineHeight:1.5 }}>
            Browse our collection to find something you love.
          </p>
          <div style={{ marginTop:4 }}><Btn onClick={onBrowse}>Browse your projects</Btn></div>
          {notice}
        </div>
      ) : (
        <>
          {/* Order-level, so it sits above the items rather than inside one */}
          {items.map((it, i) => (
            <React.Fragment key={it.id}>
              {removed && removed.index === i && notice}
              {isPdf(it)
                ? <PdfCartRow item={it} onRemove={() => remove(it.id)} />
                : <CartRow item={it} onQty={q => patch(it.id, { qty:q })} onRemove={() => remove(it.id)} onEdit={onEdit} />}
            </React.Fragment>
          ))}
          {removed && removed.index >= items.length && notice}
        </>
      )}
    </ShopLayout>
  );
}

/* Both row types share the same two trailing columns, at fixed widths, so the
   quantity control and the line price stay in one vertical line down the cart
   however wide or narrow a row's details happen to be. */
const QTY_COL = { flexShrink:0, width:160, display:"flex", flexDirection:"column", gap:10, alignItems:"flex-start" };
const PRICE_COL = { flexShrink:0, width:88, textAlign:"right", fontSize:16, fontWeight:600, color:T.textBold };

/* Shared by both row types so the delete affordance doesn't drift between them */
function RemoveLink({ onRemove }) {
  return (
    <button onClick={onRemove} style={{ background:"none", border:"none", padding:0, cursor:"pointer",
      display:"flex", alignItems:"center", gap:8, color:T.textBold }}>
      <span className="ms" style={{ fontSize:22 }}>delete</span>
      <span style={{ fontSize:16, fontWeight:600, textDecoration:"underline" }}>Remove</span>
    </button>
  );
}

/* The PDF line (Figma 12442:88949). Deliberately not the book row with pieces
   switched off: there is no quantity to step, no options to edit and no binding
   or paper spec, so it renders as its own shorter card. "Quantity: 1" is stated
   rather than shown as a stepper — a disabled stepper reads as broken. */
function PdfCartRow({ item, onRemove }) {
  const { isMobile } = useViewport();
  const thumb = isMobile ? 64 : 140;
  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow,
      padding: isMobile ? 16 : 24, display:"flex", gap: isMobile ? 12 : 24, flexWrap:"wrap" }}>
      <img src={item.img} alt="" style={coverThumb(thumb)} />
      <div style={{ flex:"1 1 200px", minWidth:0, fontSize:14, lineHeight:1.65, color:T.textBold }}>
        <div><strong>Title:</strong> {item.title}</div>
        <div><strong>Author:</strong> {item.author}</div>
        <div><strong>Project type:</strong> {item.type}</div>
        <div><strong>Project options:</strong> {item.options}</div>
        <div><strong>File size:</strong> {item.size}</div>
      </div>
      <div style={{ ...QTY_COL, width: isMobile ? "100%" : QTY_COL.width }}>
        <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>Quantity</span>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          width: isMobile ? "100%" : undefined }}>
          {/* "1 file", not "1" — a PDF is one download however many copies are
             printed, and the same words are used on Add to Cart. */}
          <span style={{ fontSize:16, color:T.textSubtle }}>1 file</span>
          {isMobile && <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>${lineTotal(item).toFixed(2)}</span>}
        </div>
        <RemoveLink onRemove={onRemove} />
      </div>
      {!isMobile && <div style={PRICE_COL}>${lineTotal(item).toFixed(2)}</div>}
    </div>
  );
}

function CartRow({ item, onQty, onRemove, onEdit }) {
  /* Mobile reflows to the wireframe's own arrangement (Figma 12442:89203) rather
     than just wrapping the desktop row: a 64px thumbnail beside the details, spec
     and "Edit options" full width, then quantity with the line price opposite it,
     and Remove beneath. Wrapping the desktop row did fit at 375px, but it buried
     the price in a fourth wrapped column and pushed Edit options away from the
     spec it edits. */
  const { isMobile } = useViewport();
  const thumb = isMobile ? 64 : 140;

  const editLink = (
    /* The Cart → Add to Cart affordance. Framed as editing options rather than
       going "back", as agreed in the 2026-07-15 design review — and it really
       goes there, so a spec picked on Add to Cart can be changed from the cart. */
    <button onClick={onEdit}
      style={{ background:"none", border:"none", padding:0, cursor:"pointer", flexShrink:0,
        fontSize:16, fontWeight:600, color:T.textLink, textDecoration:"underline" }}>
      Edit options
    </button>
  );

  const quantityBlock = (
    <div style={{ ...QTY_COL, width: isMobile ? "100%" : QTY_COL.width }}>
      <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>Quantity</span>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
        width: isMobile ? "100%" : undefined }}>
        <QtyStepper qty={item.qty} setQty={onQty} min={1} onBelowMin={onRemove} />
        {/* On mobile the line price sits opposite the stepper; on desktop it has
            its own column at the end of the row. */}
        {isMobile && <span style={{ fontSize:16, fontWeight:600, color:T.textBold }}>${lineTotal(item).toFixed(2)}</span>}
      </div>
      <RemoveLink onRemove={onRemove} />
    </div>
  );

  const spec = (
    <div style={{ minWidth:0 }}>
      <p style={{ fontSize:16, fontWeight:700, color:T.textBold }}>{item.binding}</p>
      <p style={{ fontSize:16, color:T.textBold, lineHeight:1.4 }}>{item.spec}</p>
    </div>
  );

  return (
    <div style={{ background:T.surface, borderRadius:T.radius, boxShadow:T.shadow,
      padding: isMobile ? 16 : 24, display:"flex", flexDirection:"column", gap:14 }}>
      {/* Product identity — thumbnail beside the details at every width */}
      <div style={{ display:"flex", gap: isMobile ? 12 : 24, flexWrap:"wrap" }}>
        <img src={item.img} alt="" style={coverThumb(thumb)} />
        <div style={{ flex:"1 1 200px", minWidth:0, fontSize:14, lineHeight:1.65, color:T.textBold }}>
          <div><strong>Title:</strong> {item.title}</div>
          <div><strong>Author:</strong> {item.author}</div>
          <div><strong>Project type:</strong> {item.type}</div>
          <div><strong>Project options:</strong> {item.options}</div>
          <div><strong># of pages:</strong> {item.pages}</div>
        </div>
        {!isMobile && quantityBlock}
        {!isMobile && <div style={PRICE_COL}>${lineTotal(item).toFixed(2)}</div>}
      </div>

      {isMobile ? (
        <>
          {spec}
          {editLink}
          {quantityBlock}
        </>
      ) : (
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 420px", minWidth:0 }}>{spec}</div>
          {editLink}
        </div>
      )}

      {/* The gift box travels with the copy it wraps, so it reads as part of this
          line rather than a row of its own — and its price is already inside the
          line total above. Removing it is an Edit options trip, like any other
          choice made on Add to Cart. */}
      {item.gift && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
          background:T.panelBg, borderRadius:T.radius }}>
          <img src={GIFT_BOX_IMG} alt="" style={{ width:40, height:40, objectFit:"cover",
            borderRadius:3, flexShrink:0 }} />
          <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:700, color:T.textBold }}>Gift box</span>
          <span style={{ fontSize:14, fontWeight:600, color:T.textBold, whiteSpace:"nowrap" }}>
            +${GIFT_PRICE.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Root App ── */
function App() {
  // Within the standard checkout, returning user (logged in, saved addresses) is the
  // default state. ?flow=new (also accepts "guest") forces the first-time/guest
  // experience instead. Also switchable at runtime via the demo-nav dropdown (see
  // switchUserType below). Which experience opens first is decided just below.
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const flowParam = (params.get("flow") || "").toLowerCase();
  const [loggedIn, setLoggedIn] = useState(flowParam !== "new" && flowParam !== "guest");

  /* ?step=payment opens the checkout with everything before Payment already done —
     identity, shipping address, shipping method and billing. For review sessions:
     the point being reviewed is the payment step and the billing section beside it,
     and making three reviewers fill the same address first only spends their
     patience. The values are the ones the forms fill themselves, so a preloaded
     screen and a walked-through one show the same order.

     Switching identity or restarting the flow from the demo nav clears all of it —
     the param seeds the first render, it doesn't pin the state. */
  const preloadPayment = (params.get("step") || "").toLowerCase() === "payment";
  const preloadAddr = loggedIn ? SAVED_ADDRESSES[0] : DEMO_ORDER_ADDR;

  /* ?cart=digital | ?cart=print seed the cart with one shape of order, and
     ?code=<promo> applies a promo code on the first render.

     Together they turn the states that are otherwise only reachable by shopping —
     a digital-only order, a $0 order, or both at once — into a URL that can be
     pasted into a ticket. Every one of those states changes which sections the page
     has, so "walk these six steps first" is not a usable way to hand one to
     someone; ?cart=digital&code=ALLFREE is.

     Same contract as ?step=payment above: these seed the first render, they don't
     pin the state. Removing the code, switching identity or restarting from the
     demo nav clears them, so the screen stays explorable rather than frozen.
     An unrecognised code is ignored rather than shown as an error — a bad link
     should land on a working checkout, not on a validation message. */
  const cartParam = (params.get("cart") || "").toLowerCase();
  const seededCart =
      cartParam === "digital" ? [pdfLineFor(CART_SEED[0])]
    : cartParam === "print"   ? [CART_SEED[0]]
    : CART_SEED;
  const codeParam  = (params.get("code") || "").trim().toUpperCase();
  const seededCode = PROMO_CODES[codeParam] ? codeParam : null;

  const [flow,        setFlow]        = useState(loggedIn || preloadPayment ? "checkout" : "entry");
  const [userEmail,   setUserEmail]   = useState(loggedIn || preloadPayment ? DEMO_ORDER_EMAIL : "");
  const [expressModal,setExpressModal]= useState(null);
  /* Which express treatment the cart shows — the same two the Checkout Link fork
     compares, so they can be reviewed against each other in one sitting. */
  const [expressStyle,setExpressStyle]= useState("single");

  /* Which experience the demo is showing:
       "standard"      — the single-page checkout
       "addtocart"     — Add to Cart, first page of the regular flow
       "cart"          — Cart
       "checkout-link" — the Checkout-Link fork (PDP → cart → guest checkout →
                         confirmation → email → guest portal)
     All four are selectable from the demo-mode dropdown, and ?flow=<name> opens
     any of them directly (?flow=new and ?flow=guest name states of the standard
     checkout, so they land there).

     This branch is the Checkout-Link WIP deployment, so it OPENS on
     "checkout-link" — the regular flow is still fully reachable, just not the
     landing view. On main the default is the regular flow instead. */
  const REGULAR_FIRST = ["standard", "new", "guest", "addtocart", "cart"].includes(flowParam);
  const [experience, setExperience] = useState(
    !REGULAR_FIRST ? "checkout-link"
      : (flowParam === "addtocart" || flowParam === "cart" ? flowParam : "standard"));

  /* The regular flow's cart, owned here so Add to Cart → Cart → checkout share it */
  const [cartItems, setCartItems] = useState(seededCart);
  /* Add to Cart is a fresh configuration unless the cart sent the buyer back to
     it, in which case it opens on that line's own settings. Null means "fresh". */
  const [atcConfig, setAtcConfig] = useState(null);
  /* The cart row keeps the joined spec string, not the three selections behind
     it, so the selections are remembered here for the trip back. */
  const [printOpts, setPrintOpts] = useState(ATC_DEFAULTS);

  const [guestCompleted, setGuestCompleted] = useState(preloadPayment);

  /* Owned here rather than in the summary panel, because whether a code is on the
     order decides whether the Payment section exists at all. */
  const [appliedCode, setAppliedCode] = useState(seededCode);
  const freeOrder = isFreeCode(appliedCode);

  /* The checkout summarises the cart the buyer arrived with, so walking
     Cart → Checkout shows one order rather than two different ones. */
  const orderItems = cartItems.length ? cartItems : CART_SEED;

  /* ── What shape of order is this? ──
     Two questions the cart answers on the buyer's behalf, asked before the section
     state below because the answers decide which sections the page even has:

     `digitalOnly` — nothing in the cart gets printed, so there is nothing to ship.
       Shipping address and Shipping method have no question to ask, and the billing
       address becomes the only address on the order (it's what tax is calculated
       from, which was already true).
     `freeOrder`   — the total is $0.00, so no card is collected and there's no tax
       to work out. Billing address and Payment have no question to ask either.

     A free digital order is both at once — the case with no wireframe until now:
     every section below Sign in is answered before the buyer reaches it. */
  const digitalOnly = orderItems.every(isPdf);

  /* The first section that still has a question in it. Used wherever the flow starts
     or restarts, so a digital or free order opens on something actionable instead of
     on a step it's about to tell the buyer they can skip. Null means there's nothing
     left to do but place the order. */
  const firstActiveStep = digitalOnly ? (freeOrder ? null : "billing") : "shipping";

  /* A true accordion: exactly ONE section is open at a time across the whole page.
     Express checkout and the sign-in step used to own their own independent open
     state, so completing them was the only thing that closed them — opening
     Shipping left both still expanded above it, and three panels could be open at
     once. Every section now reads from this single value, so opening any one of
     them closes whatever was open before.

     Sections: "express" | "guest" | "shipping" | "billing" | "shippingOpt" | "payment" | null.
     A returning user starts on the first step with a question in it (Shipping on a
     printed order, Billing on a digital one, nothing at all on a free digital one);
     a first-time user starts on the sign-in / guest step, which is the first thing
     they have to act on. Express starts collapsed either way — it can't be open at
     the same time as the step below it any more. */
  const firstSection = loggedIn ? firstActiveStep : "guest";
  const [openSection, setOpenSection] = useState(preloadPayment ? "payment" : firstSection);
  const secOpen   = k => openSection === k;
  const openSec   = k => setOpenSection(k);
  const closeSec  = k => setOpenSection(s => (s === k ? null : s));
  const toggleSec = k => setOpenSection(s => (s === k ? null : k));

  const [shippingAddr,   setShippingAddr]   = useState(preloadPayment ? preloadAddr : null);
  const [shippingMethod, setShippingMethod] = useState(preloadPayment ? "economy" : null);
  const [shippingCost,   setShippingCost]   = useState(preloadPayment ? 9.99 : null);
  const [paymentDone,    setPaymentDone]    = useState(false);
  const [discountAmt,    setDiscountAmt]    = useState(null);
  /* Billing address: its own section, but pre-answered from shipping. `billingSame`
     is what the section reports back, and it's what Payment and the confirmation
     show — the address itself is a copy, so it can't drift if shipping changes. */
  const [billingAddr,    setBillingAddr]    = useState(preloadPayment ? preloadAddr : null);
  const [billingSame,    setBillingSame]    = useState(true);

  const handlePlaceOrder = () => setFlow("confirm");

  const summaryProps = {
    items: orderItems,
    discountAmt, shippingCost,
    /* Tax is calculated from the billing address, not the shipping one — that's
       the reason billing has to be collected before Payment on any order with a
       digital item. A free order never collects one, but its tax is a genuine
       $0.00 rather than an unanswered question, so it counts as known. */
    hasBilling: !!billingAddr || freeOrder,
    /* A $0 order has nothing left to pay, so the Place order button can't wait on a
       payment step that isn't being shown. */
    paymentDone: paymentDone || freeOrder,
    onPlaceOrder:handlePlaceOrder,
    appliedCode,
    onApplyCode: setAppliedCode,
    onRemoveCode: () => setAppliedCode(null),
    digitalOnly,
  };

  const reset = () => {
    setFlow(loggedIn ? "checkout" : "entry"); setUserEmail(loggedIn ? "jane.doe@blurb.com" : "");
    setGuestCompleted(false);
    setShippingAddr(null); setShippingMethod(null); setShippingCost(null);
    setBillingAddr(null); setBillingSame(true);
    setPaymentDone(false); setDiscountAmt(null); setAppliedCode(null);
    setOpenSection(firstSection);
  };

  /* Switch between a first-time user (guest, no saved addresses) and a returning
     user (logged in, saved shipping/billing addresses) — restarts the flow from
     scratch under the new identity.

     Also the entry point back from the Checkout Link fork, which hands over a
     prototype name rather than an identity: "regular" lands on the first stop of
     this journey, so returning doesn't mean arriving mid-flow. */
  const switchUserType = (type) => {
    if (type === "checkout-link") { setExperience("checkout-link"); return; }
    if (type === "regular" || type === "addtocart" || type === "cart") {
      /* Returning to the shop pages restores the seeded cart, so the Cart page is
         never reached empty by accident after a previous run removed everything. */
      if (!cartItems.length) setCartItems(CART_SEED);
      setAtcConfig(null);
      setExperience(type === "cart" ? "cart" : "addtocart"); return;
    }
    setExperience("standard");
    const next = type === "returning";
    setLoggedIn(next);
    setFlow(next ? "checkout" : "entry");
    setUserEmail(next ? "jane.doe@blurb.com" : "");
    setGuestCompleted(false);
    setShippingAddr(null); setShippingMethod(null); setShippingCost(null);
    setBillingAddr(null); setBillingSame(true);
    setPaymentDone(false); setDiscountAmt(null); setAppliedCode(null);
    /* Clearing the code above makes this a paid order again, so the first active step
       is Shipping on a printed order and Billing on a digital one. */
    setOpenSection(next ? (digitalOnly ? "billing" : "shipping") : "guest");
  };

  const handleGuestContinue = (email) => {
    setUserEmail(email);
    setGuestCompleted(true);
    setFlow("checkout");
    /* Closes the guest step and express with it. Not always Shipping: on a digital
       order that section has nothing to ask, and on a free digital order neither does
       anything below it — `firstActiveStep` is null there, which collapses everything
       and leaves Place order as the only thing outstanding. */
    openSec(firstActiveStep);
  };

  /* Completing the shipping address answers the billing section too: it lands
     already completed as "Same as shipping address" and the flow moves on to
     Shipping method. That's what keeps a dedicated billing section from costing
     the common case a step — the buyer only stops there if they open it. */
  /* Deliberately does not answer the billing question on the buyer's behalf. It used
     to complete billing as "same as shipping" here and skip the section, which meant
     the default was never actually shown — the buyer got billed to an address they
     were never given the chance to see or change. Confirming shipping now only
     confirms shipping. */
  const handleShippingDone = addr => {
    setShippingAddr(addr);
    openSec("shippingOpt");
  };

  const handleBillingDone = (addr, same) => {
    setBillingAddr(same ? shippingAddr : addr);
    setBillingSame(same);
    /* Reached in order the first time, but also re-openable from Payment's
       "Change" link — so return to whatever step is still outstanding rather than
       always marching forward. */
    if (!shippingMethod) openSec("shippingOpt");
    else if (!paymentDone) openSec("payment");
    else closeSec("billing");
  };

  const handleShippingMethodDone = (id, cost) => {
    setShippingMethod(id);
    setShippingCost(cost);
    /* Billing, not Payment — it's the next section down, and skipping it was what
       hid the "same as shipping" checkbox from the buyer entirely. */
    openSec("billing");
  };

  const handlePaymentDone = () => { setPaymentDone(true); closeSec("payment"); };

  /* ── Payment appearing and disappearing under a promo code ──
     Removing a free-order code puts a required section back into a page the buyer has
     already scrolled past, which is the real risk in hiding Payment at all: they'd
     find out by failing to place the order. So the step is opened, scrolled to, and
     announced. The reverse direction is announced too — the section they were about
     to fill in has just gone. Neither is announced on first render. */
  const paymentSlotRef = useRef(null);
  const wasFreeOrder   = useRef(freeOrder);
  const [payLiveMsg, setPayLiveMsg] = useState("");

  useEffect(() => {
    if (wasFreeOrder.current === freeOrder) return;
    wasFreeOrder.current = freeOrder;

    if (freeOrder) {
      setPayLiveMsg("Your order total is now $0.00. No payment is required, and the payment step has been removed.");
      return;
    }
    setPayLiveMsg("Payment is required again. Enter your payment details to place this order.");
    if (paymentDone) return;                    // already paid before the code landed
    if (billingAddr) openSec("payment");
    paymentSlotRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
  }, [freeOrder, billingAddr, paymentDone]);

  /* "Back to cart" now has a real destination. Restores the seeded cart if a
     previous run emptied it, so the link never lands on an empty cart. */
  const goCart = () => { if (!cartItems.length) setCartItems(CART_SEED); setExperience("cart"); };

  /* Jumping straight to the confirmation from the demo nav. That screen reports the
     email, address and shipping method the checkout would have collected, so supply
     them rather than showing a confirmation of nothing.
     Mirrors backfillOrder in CheckoutLinkApp.jsx. */
  const backfillOrder = () => {
    if (!userEmail)      setUserEmail(DEMO_ORDER_EMAIL);
    if (!shippingAddr)   setShippingAddr(DEMO_ORDER_ADDR);
    if (!billingAddr)    setBillingAddr(DEMO_ORDER_ADDR);
    if (!shippingMethod) { setShippingMethod("economy"); setShippingCost(9.99); }
    setPaymentDone(true);
  };

  /* The stepper walks the journey; each stop is reachable from any other. Landing on
     the cart restores the seeded items so no stop is ever reached empty by accident
     after a previous run removed everything. */
  const jumpStage = key => {
    if (!cartItems.length) setCartItems(CART_SEED);
    setAtcConfig(null);
    if (key === "addtocart" || key === "cart") { setExperience(key); return; }
    setExperience("standard");
    if (key === "confirm") { backfillOrder(); setFlow("confirm"); return; }
    reset();   // "checkout" — start it over under the current identity
  };

  const demoNav = {
    stage: experience === "addtocart" || experience === "cart" ? experience
      : flow === "confirm" ? "confirm" : "checkout",
    onJump: jumpStage,
    onSwitchPrototype: p => { if (p === "checkout-link") setExperience("checkout-link"); },
    userType: loggedIn ? "returning" : "new",
    onUserTypeChange: switchUserType,
    expressStyle,
    onExpressStyleChange: setExpressStyle,
  };

  /* ── Checkout-Link fork (selected from the demo dropdown) ──
     Handed the same switcher the regular flow's banner uses, rather than a
     one-way exit: leaving the fork used to land on the checkout and nowhere
     else, so reaching Add to cart meant a detour through a screen you weren't
     going to. Every screen in the build now reaches every other one directly. */
  if (experience === "checkout-link")
    return <CheckoutLinkApp onSwitchFlow={switchUserType} />;

  /* ── Regular flow: Add to Cart → Cart → single-page checkout ── */
  if (experience === "addtocart") return (
    <AddToCartPage demoNav={demoNav}
      config={atcConfig}
      onAdded={({ qty, gift, format, spec, paper, endsheet, finish, logoPage }) => {
        setPrintOpts({ ...ATC_DEFAULTS, paper, endsheet, finish, logoPage });
        /* The cart shows exactly what was just added and nothing else — the
           chosen format decides the lines: a printed copy, its PDF, or both. */
        const book = { ...CART_SEED[0], qty, gift, spec };
        setCartItems([
          ...(hasPrint(format)   ? [book] : []),
          ...(hasDigital(format) ? [pdfLineFor(book)] : []),
        ]);
        setExperience("cart");
      }} />
  );

  if (experience === "cart") return (
    <>
    {/* Paying from the cart skips the checkout entirely, so the order it places has
        none of the details the checkout would have collected — backfilled the same
        way a jump to the confirmation is, or the confirmation reports an order of
        nothing. */}
    <ExpressModal method={expressModal} onClose={() => setExpressModal(null)}
      onConfirm={() => { setExpressModal(null); backfillOrder(); setExperience("standard"); setFlow("confirm"); }} />
    <CartPage demoNav={demoNav}
      items={cartItems} setItems={setCartItems}
      onBrowse={() => { setAtcConfig(null); setExperience("addtocart"); }}
      /* Format comes from what the cart holds rather than from what was picked
         last time — remove the PDF line and Edit options must open on Print. */
      onEdit={() => {
        const book = cartItems.find(it => !isPdf(it));
        const pdf  = cartItems.some(isPdf);
        setAtcConfig({
          ...printOpts,
          qty:  book ? book.qty : 1,
          gift: !!(book && book.gift),
          format: book ? (pdf ? "both" : "print") : "digital",
        });
        setExperience("addtocart");
      }}
      onCheckout={() => setExperience("standard")}
      expressStyle={expressStyle}
      onExpressBuy={setExpressModal} />
    </>
  );

  /* ── Confirmation screen ── */
  if (flow === "confirm") return (
    <CheckoutLayout summaryProps={{...summaryProps, paymentDone:true, orderPlaced:true}} onCartClick={reset}
      demoNav={demoNav}>
      <OrderConfirmationPanels
        email={userEmail}
        shippingAddr={shippingAddr}
        shippingMethod={shippingMethod}
        loggedIn={loggedIn}
        /* Same list the summary uses, so the refund is the order minus its
           digital lines rather than a number written down separately. */
        items={summaryProps.items}
        /* Nothing was charged, so cancelling can't promise money back. */
        freeOrder={freeOrder}
      />
    </CheckoutLayout>
  );

  /* ── Entry screen ── */
  if (flow === "entry") return (
    <CheckoutLayout summaryProps={summaryProps} onCartClick={goCart}
      demoNav={demoNav}>
      <ExpressModal method={expressModal} onClose={() => setExpressModal(null)}
        onConfirm={() => { setExpressModal(null); setFlow("confirm"); }} />
      <ExpressCheckout onExpressSelect={setExpressModal} open={secOpen("express")} onToggle={() => toggleSec("express")} />
      <OrDivider />
      <GuestSignIn
        open={secOpen("guest")}
        onToggle={() => toggleSec("guest")}
        completed={guestCompleted}
        onContinue={handleGuestContinue}
      />
      {/* The steps ahead, shown disabled until the buyer signs in — except the ones the
          cart has already answered, which are shown resolved here too. Listing a step
          as "coming up" and then never showing it is the confusion this whole pattern
          exists to avoid, and it reads the same before sign-in as after it. */}
      {digitalOnly ? (
        <>
          <DigitalShippingAddress open={false} onToggle={() => {}} />
          <DigitalShippingMethod  open={false} onToggle={() => {}} />
        </>
      ) : (
        ["Shipping address","Shipping method"].map(title => (
          <AccordionSection key={title} title={title} open={false} onToggle={() => {}} disabled={true} />
        ))
      )}
      {freeOrder ? (
        <>
          <FreeOrderBilling open={false} onToggle={() => {}} />
          <FreeOrderPayment code={appliedCode} open={false} onToggle={() => {}} />
        </>
      ) : (
        ["Billing address","Payment"].map(title => (
          <AccordionSection key={title} title={title} open={false} onToggle={() => {}} disabled={true} />
        ))
      )}
    </CheckoutLayout>
  );

  /* ── Full checkout flow ── */
  return (
    <CheckoutLayout summaryProps={summaryProps} onCartClick={goCart}
      demoNav={demoNav}>
      <ExpressModal method={expressModal} onClose={() => setExpressModal(null)}
        onConfirm={() => { setExpressModal(null); setFlow("confirm"); }} />
      <ExpressCheckout onExpressSelect={setExpressModal} open={secOpen("express")} onToggle={() => toggleSec("express")} />
      <OrDivider />

      {!loggedIn && (
        <GuestSignIn
          open={secOpen("guest")}
          onToggle={() => toggleSec("guest")}
          completed={guestCompleted}
          onContinue={handleGuestContinue}
          presetEmail={preloadPayment ? DEMO_ORDER_EMAIL : ""}
        />
      )}

      {/* ── Shipping: two questions, or neither ──
          A digital-only order has nothing to ship. Both sections stay in place, shown
          already answered, rather than the page asking for a delivery address and a
          delivery speed for a file — or dropping two steps and leaving the buyer to
          notice. */}
      {digitalOnly ? (
        <>
          <DigitalShippingAddress open={secOpen("shipping")} onToggle={() => toggleSec("shipping")} />
          <DigitalShippingMethod  open={secOpen("shippingOpt")} onToggle={() => toggleSec("shippingOpt")} />
        </>
      ) : (
        <>
          {loggedIn ? (
            <SavedShippingAddress
              open={secOpen("shipping")}
              onToggle={() => toggleSec("shipping")}
              onComplete={handleShippingDone}
              savedDone={!!shippingAddr && !secOpen("shipping")}
              onModify={() => openSec("shipping")}
            />
          ) : (
            <ShippingAddress
              open={secOpen("shipping")}
              onToggle={() => toggleSec("shipping")}
              disabled={!!shippingAddr && !secOpen("shipping")}
              onComplete={handleShippingDone}
              savedAddress={shippingAddr}
              onModify={() => { setShippingAddr(null); openSec("shipping"); }}
            />
          )}

          <ShippingOptions
            open={secOpen("shippingOpt")}
            onToggle={() => toggleSec("shippingOpt")}
            disabled={!shippingAddr}
            onConfirm={handleShippingMethodDone}
            savedMethod={shippingMethod}
            freeShipping={freeOrder}
          />
        </>
      )}

      {/* Directly above Payment, not up with the shipping address. A billing address
          asked before the buyer has picked a way to pay reads as a question out of
          nowhere; asked immediately before Payment it reads as the first half of
          paying. Nothing is lost by moving it down: the answer is captured when the
          shipping address is confirmed, so tax still lands in the summary at that
          moment regardless of where this section sits. */}
      {freeOrder ? (
        <FreeOrderBilling open={secOpen("billing")} onToggle={() => toggleSec("billing")} />
      ) : (
        <BillingAddress
          open={secOpen("billing")}
          onToggle={() => toggleSec("billing")}
          /* On a digital order this is the first section with a question in it, so it
             can't wait on a shipping address that is never collected. */
          disabled={digitalOnly ? false : !shippingAddr}
          completed={!!billingAddr && !secOpen("billing")}
          shippingAddr={shippingAddr}
          billing={billingAddr}
          sameAsShipping={billingSame}
          onComplete={handleBillingDone}
          loggedIn={loggedIn}
          /* No shipping address exists on a digital order, so "same as shipping" has
             nothing to be the same as. */
          noShipping={digitalOnly}
        />
      )}

      {/* One slot, two occupants — see ResolvedSection for why a $0 order gets an
          answered section here rather than a disabled Payment one. The ref is on the
          wrapper so the slot can be scrolled to when Payment comes back. */}
      <div ref={paymentSlotRef}>
        {freeOrder ? (
          <FreeOrderPayment code={appliedCode}
            open={secOpen("payment")} onToggle={() => toggleSec("payment")} />
        ) : (
          <Payment
            open={secOpen("payment")}
            onToggle={() => toggleSec("payment")}
            /* Billing, not shipping method — it's the section directly above, and gating
               on the wrong one let the buyer open Payment with billing still unanswered. */
            disabled={!billingAddr}
            onComplete={handlePaymentDone}
            completed={paymentDone && !secOpen("payment")}
          />
        )}
      </div>
      <div aria-live="polite" style={SR_ONLY}>{payLiveMsg}</div>
    </CheckoutLayout>
  );
}

export default App;
