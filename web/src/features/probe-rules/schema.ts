import { z } from "zod";

export const RULE_EXACT = "exact";
export const RULE_PREFIX = "prefix";
export const RULE_SUFFIX = "suffix";
export const RULE_CONTAINS = "contains";
export const RULE_KINDS = [RULE_EXACT, RULE_PREFIX, RULE_SUFFIX, RULE_CONTAINS] as const;

export const ADD_MARKER = "Add marker";
export const MARKER_LABEL = "Label";
export const MARKER_PATTERN = "Pattern";
export const MARKER_KIND = "Match";
export const MARKER_SAVED = "The marker is saved. Matching paths pick it up the next time the journal is read.";
export const MARKER_EMPTY = "No markers have been added yet.";
export const REMOVE_MARKER = "Remove";

export const KIND_LABEL: Record<(typeof RULE_KINDS)[number], string> = {
  [RULE_EXACT]: "Exact path",
  [RULE_PREFIX]: "Starts with",
  [RULE_SUFFIX]: "Ends with",
  [RULE_CONTAINS]: "Contains",
};

export const probeRuleSchema = z.object({
  label: z.string().trim().min(1, "Enter the label.").max(40, "Use 40 characters or fewer."),
  kind: z.enum(RULE_KINDS),
  pattern: z
    .string()
    .trim()
    .min(1, "Enter the pattern.")
    .max(200, "Use 200 characters or fewer.")
    .refine((value) => !/\s/.test(value), "The pattern cannot contain a space."),
});
