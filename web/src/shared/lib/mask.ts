export const MASK = "********";

export function covered(value: string, hidden: boolean) {
  if (!hidden || value === "") return value;
  return MASK;
}

export function hideColumn(name: string) {
  return `Hide ${name}`;
}

export function showColumn(name: string) {
  return `Show ${name}`;
}
