"use client";

import { useEffect, useState } from "react";
import { createProbeRule, deleteProbeRule, readProbeRules, type ProbeRule } from "@/features/probe-rules/api";
import {
  ADD_MARKER,
  KIND_LABEL,
  MARKER_EMPTY,
  MARKER_KIND,
  MARKER_LABEL,
  MARKER_PATTERN,
  MARKER_SAVED,
  REMOVE_MARKER,
  RULE_KINDS,
  RULE_SUFFIX,
  probeRuleSchema,
} from "@/features/probe-rules/schema";
import { apiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SelectField } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";

export function MarkerForm() {
  const [rules, setRules] = useState<ProbeRule[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<string>(RULE_SUFFIX);
  const [fieldError, setFieldError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState("");

  useEffect(() => {
    readProbeRules()
      .then(setRules)
      .catch(() => setFailed(true));
  }, []);

  return (
    <section className="glass-panel p-4">
      <p className="text-xs text-muted-foreground">
        A new pattern is matched when the journal is read. The stored request stays as it was.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1.4fr)_auto] sm:items-end"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const parsed = probeRuleSchema.safeParse({
            label: String(data.get("label") ?? ""),
            kind,
            pattern: String(data.get("pattern") ?? ""),
          });
          if (!parsed.success) {
            setFieldError(parsed.error.issues[0]?.message ?? "Enter the pattern.");
            setNotice("");
            return;
          }
          const form = event.currentTarget;
          setPending(true);
          setFieldError("");
          setNotice("");
          createProbeRule(parsed.data.label, parsed.data.kind, parsed.data.pattern)
            .then((rule) => {
              setRules((current) => [...(current ?? []), rule]);
              setNotice(MARKER_SAVED);
              form.reset();
            })
            .catch((reason: Error) => {
              setFieldError(
                reason.message === apiError.exists ? "That pattern is already a marker." : "The marker was not saved.",
              );
            })
            .finally(() => setPending(false));
        }}
      >
        <Label className="grid gap-1 text-xs text-muted-foreground">
          {MARKER_LABEL}
          <Input name="label" maxLength={40} aria-label={MARKER_LABEL} />
        </Label>
        <Label className="grid gap-1 text-xs text-muted-foreground">
          {MARKER_KIND}
          <SelectField
            label={MARKER_KIND}
            value={kind}
            onValueChange={setKind}
            options={RULE_KINDS.map((item) => ({ value: item, label: KIND_LABEL[item] }))}
          />
        </Label>
        <Label className="grid gap-1 text-xs text-muted-foreground">
          {MARKER_PATTERN}
          <Input name="pattern" maxLength={200} aria-label={MARKER_PATTERN} className="font-mono" />
        </Label>
        <Button type="submit" pending={pending}>
          {ADD_MARKER}
        </Button>
      </form>
      {fieldError ? <p className="mt-2 text-xs text-destructive">{fieldError}</p> : null}
      {notice ? <p className="mt-2 text-xs text-muted-foreground">{notice}</p> : null}
      {failed ? <p className="mt-4 text-sm text-muted-foreground">The marker list did not answer.</p> : null}
      {!failed && rules === null ? <Skeleton className="mt-4 h-8 w-full" /> : null}
      {!failed && rules !== null && rules.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{MARKER_EMPTY}</p>
      ) : null}
      {!failed && rules !== null && rules.length > 0 ? (
        <ul className="mt-4 divide-y divide-cyber-cyan/10">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="text-sm">{rule.label}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {KIND_LABEL[rule.kind as keyof typeof KIND_LABEL] ?? rule.kind} {rule.pattern}
                </span>
              </span>
              {rule.custom ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-cyber-cyan"
                  pending={removing === rule.id}
                  onClick={() => {
                    setRemoving(rule.id);
                    deleteProbeRule(rule.id)
                      .then(() => setRules((current) => (current ?? []).filter((item) => item.id !== rule.id)))
                      .catch(() => setFieldError("The marker was not removed."))
                      .finally(() => setRemoving(""));
                  }}
                >
                  {REMOVE_MARKER}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
