export function shareFlight<T>(slot: { current: Promise<T> | null }, start: () => Promise<T>) {
  if (slot.current) return slot.current;
  const flight = start().finally(() => {
    if (slot.current === flight) slot.current = null;
  });
  slot.current = flight;
  return flight;
}
