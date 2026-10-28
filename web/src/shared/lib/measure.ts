export const MEASUREMENT_ID = "G-L5J5WT031N";

const SITE_HOST = "ledgesec.com";
const WWW_HOST = "www.ledgesec.com";

export function measurementSrc() {
  return `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
}

export function measuresSite(host: string) {
  const name = host.split(":")[0].toLowerCase();
  return name === SITE_HOST || name === WWW_HOST;
}

export function measurementSnippet() {
  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`;
}
