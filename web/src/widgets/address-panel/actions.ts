export type AddressAction = {
  id: "details" | "requests" | "copy" | "block" | "challenge";
  label: string;
  hint: string;
  enabled: boolean;
  group: "look" | "keep" | "decide";
};

export const ADDRESS_ACTIONS: AddressAction[] = [
  { id: "details", label: "Details", hint: "Edges, sites, and the paths it touched.", enabled: true, group: "look" },
  { id: "requests", label: "Requests", hint: "Open the latest requests from this address.", enabled: true, group: "look" },
  { id: "copy", label: "Copy address", hint: "Copy the address.", enabled: true, group: "keep" },
  { id: "block", label: "Block", hint: "Observation lets the request through.", enabled: false, group: "decide" },
  { id: "challenge", label: "Challenge", hint: "Observation lets the request through.", enabled: false, group: "decide" },
];

export function requestCount(edges: Record<string, number>) {
  return Object.values(edges).reduce((sum, count) => sum + count, 0);
}
