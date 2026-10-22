export const FLASH_REQUEST = "request";
export const FLASH_PROBE = "probe";

export type CountryFlashTone = typeof FLASH_REQUEST | typeof FLASH_PROBE;

export type CountryFlash = { tone: CountryFlashTone; stamp: string };

const COUNTRY_CODE = /^[A-Z]{2}$/;

export function countryFlashes(
  rows: { key: string; country: string; marked: boolean }[],
  fresh: readonly string[],
): Map<string, CountryFlash> {
  const wanted = new Set(fresh);
  const grouped = new Map<string, { tone: CountryFlashTone; keys: string[] }>();
  for (const row of rows) {
    if (!wanted.has(row.key)) continue;
    const code = row.country.trim().toUpperCase();
    if (!COUNTRY_CODE.test(code)) continue;
    const current = grouped.get(code);
    const keys = current?.keys ?? [];
    keys.push(row.key);
    grouped.set(code, {
      tone: row.marked || current?.tone === FLASH_PROBE ? FLASH_PROBE : FLASH_REQUEST,
      keys,
    });
  }
  return new Map(
    [...grouped.entries()].map(([code, flash]) => [code, { tone: flash.tone, stamp: flash.keys.join("\n") }]),
  );
}
