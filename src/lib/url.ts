/** Prefixes a root-relative path ("/experiences/", "/images/logo.png") with Astro's
 *  configured `base` (e.g. "/pgdba-ml/") so links and asset references work correctly when
 *  the site is served from a GitHub Pages project subpath rather than a domain root. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}
