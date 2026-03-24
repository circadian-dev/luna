const STYLE_ID = 'luna-widget-utilities';
const CSS = /* css */ `
.absolute{position:absolute}
.relative{position:relative}
.fixed{position:fixed}
.inset-0{inset:0}
.top-0{top:0}
.right-0{right:0}
.bottom-0{bottom:0}
.left-0{left:0}
.w-full{width:100%}
.h-full{height:100%}
.overflow-hidden{overflow:hidden}
.pointer-events-none{pointer-events:none}
.select-none{-webkit-user-select:none;user-select:none}
.flex{display:flex}
.inline-flex{display:inline-flex}
.hidden{display:none}
.block{display:block}
.contents{display:contents}
.items-center{align-items:center}
.items-start{align-items:flex-start}
.justify-between{justify-content:space-between}
.justify-center{justify-content:center}
.gap-2{gap:0.5rem}
.cursor-pointer{cursor:pointer}
.rounded-full{border-radius:9999px}
.rounded-2xl{border-radius:1rem}
.rounded-\\[1\\.6rem\\]{border-radius:1.6rem}
.rounded-\\[1\\.8rem\\]{border-radius:1.8rem}
.bg-white{background-color:#fff}
.px-5{padding-left:1.25rem;padding-right:1.25rem}
.pt-4{padding-top:1rem}
.pt-5{padding-top:1.25rem}
.pt-\\[18px\\]{padding-top:18px}
.pb-\\[14px\\]{padding-bottom:14px}
.mt-0\\.5{margin-top:0.125rem}
.font-light{font-weight:300}
.uppercase{text-transform:uppercase}
.text-\\[10px\\]{font-size:10px}
.text-\\[11px\\]{font-size:11px}
.text-\\[13px\\]{font-size:13px}
.text-\\[19px\\]{font-size:19px}
.text-\\[22px\\]{font-size:22px}
.tracking-\\[0\\.1em\\]{letter-spacing:0.1em}
.tracking-\\[0\\.12em\\]{letter-spacing:0.12em}
.tracking-\\[0\\.15em\\]{letter-spacing:0.15em}
.tabular-nums{font-variant-numeric:tabular-nums}
.transition-opacity{transition-property:opacity;transition-duration:150ms;transition-timing-function:cubic-bezier(0.4,0,0.2,1)}
.duration-300{transition-duration:300ms}
.isolate{isolation:isolate}
.group{}
.group:hover .group-hover\\:opacity-60{opacity:0.6}
.group:hover .group-hover\\:opacity-68{opacity:0.68}
`;

let injected = false;

export function injectLunaCSS(): void {
  if (injected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}
