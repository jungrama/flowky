/** Flowky is locked to light mode. Pin data-theme="light" on <html> so the
 *  system dark @media query can't take over. */
export function initTheme(): void {
  document.documentElement.setAttribute("data-theme", "light");
}
