const staticPaths = new Set(["/bg-login.webp","/favicon.svg","/home-hero-1.webp","/home-hero-2.webp","/home-hero-3.webp","/home-hero-4.webp","/manifest.webmanifest","/q-manifest.json","/robots.txt","/sitemap.xml","/smoke/assets/C-JMaY8m-style.css","/smoke/entry.smoke.js","/smoke/entry.smoke.mjs","/smoke/entry.smoke.mjs.map"]);
function isStaticPath(method, url) {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }
  const p = url.pathname;
  if (p.startsWith("/build/")) {
    return true;
  }
  if (p.startsWith("/assets/")) {
    return true;
  }
  if (staticPaths.has(p)) {
    return true;
  }
  if (p.endsWith('/q-data.json')) {
    const pWithoutQdata = p.replace(/\/q-data.json$/, '');
    if (staticPaths.has(pWithoutQdata + '/')) {
      return true;
    }
    if (staticPaths.has(pWithoutQdata)) {
      return true;
    }
  }
  return false;
}
export { isStaticPath };