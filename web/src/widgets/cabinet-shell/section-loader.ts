export const SECTION_LOADER_MS = 700;

export function sectionIsLoading(hold: boolean, journalReady: boolean, failed: boolean, hosts: boolean) {
  if (hold) return true;
  if (hosts || failed || journalReady) return false;
  return true;
}
