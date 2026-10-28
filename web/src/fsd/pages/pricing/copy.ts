export const PRICING_TITLE = "Self-hosted, or custom work";
export const PRICING_DESCRIPTION =
  "Self-hosted is the journal as it is now. Premium is custom work we do when you ask for it. The collector does not change the request.";
export const PRICING_KICKER = "Pricing";
export const PRICING_LEDE =
  "Self-hosted is what you can run today. Premium is the custom piece we build for your hosts after you write. There is no tariff table.";
export const PRICING_ASK = "Name the pain and the servers. The note is marked Premium.";
export const PRICING_INTEREST = "premium";

export const SELF_NAME = "Self-hosted";
export const SELF_PRICE = "MIT";
export const SELF_LEDE = "You run the journal. The collector reads the log and does not change the request.";
export const SELF_POINTS = [
  "OpenResty, the Linux daemon, and Coolify.",
  "The cabinet shows the path, the status, the country, and the User-Agent.",
  "A probe path is marked when the journal is read.",
  "An admin sees addresses. A site user does not.",
  "A line stays for three years.",
  "Apache and DNS are listed and cannot be added yet.",
] as const;

export const PREMIUM_NAME = "Premium";
export const PREMIUM_PRICE = "On request";
export const PREMIUM_LEDE =
  "We build the piece your hosts need. The future pages are the work we can take on. None of it is in the product until that work is done.";
export const PREMIUM_POINTS = [
  "The note names the pain. We answer with a scope for your servers.",
  "The work can be a notice, another collector, a brief, or any other item on those pages.",
  "It stays off the request unless the scope says otherwise, and even then it starts off.",
  "The journal you already run stays the base. Premium does not replace it.",
] as const;

export function pricingText() {
  return [
    PRICING_TITLE,
    PRICING_DESCRIPTION,
    PRICING_LEDE,
    PRICING_ASK,
    SELF_NAME,
    SELF_PRICE,
    SELF_LEDE,
    ...SELF_POINTS,
    PREMIUM_NAME,
    PREMIUM_PRICE,
    PREMIUM_LEDE,
    ...PREMIUM_POINTS,
  ].join(" ");
}
