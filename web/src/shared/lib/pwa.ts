export const THEME_COLOR = "#f4f0e6";
export const ICON_192 = "/icons/icon-192.png";
export const ICON_512 = "/icons/icon-512.png";
export const ICON_MASKABLE = "/icons/icon-maskable-512.png";

export function keepsPwa(host: string) {
  const name = host.split(":")[0].toLowerCase();
  return !name.startsWith("dash.") && !name.startsWith("admin.");
}
