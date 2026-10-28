"use client";

import { useState, type FormEvent } from "react";
import { DEMO_BAD, DEMO_BUSY, DEMO_CHANNEL, DEMO_EMAIL, DEMO_ERROR, DEMO_HOST, DEMO_HOST_HINT, DEMO_INTEREST, DEMO_MESSAGE, DEMO_MESSAGE_HINT, DEMO_NAME, DEMO_SENT, DEMO_SUBMIT, DEMO_TELEGRAM, DEMO_TELEGRAM_HINT, DEMO_WHATSAPP, DEMO_WHATSAPP_HINT } from "@/fsd/pages/demo/copy";
import { CHANNEL_EMAIL, CHANNEL_TELEGRAM, CHANNEL_WHATSAPP, CONTACT_PATH, demoSchema, FIELD_CHANNEL, FIELD_HOST, FIELD_INTEREST, FIELD_MESSAGE, FIELD_NAME, FIELD_REACH, FIELD_SENT, type Channel } from "@/features/demo/schema";
import { apiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const fieldClass = "h-10 bg-card px-3";

const CHOICES: { value: Channel; label: string; hint: string; type: "email" | "text" | "tel"; autoComplete: string }[] = [
  { value: CHANNEL_EMAIL, label: DEMO_EMAIL, hint: "", type: "email", autoComplete: "email" },
  { value: CHANNEL_TELEGRAM, label: DEMO_TELEGRAM, hint: DEMO_TELEGRAM_HINT, type: "text", autoComplete: "off" },
  { value: CHANNEL_WHATSAPP, label: DEMO_WHATSAPP, hint: DEMO_WHATSAPP_HINT, type: "tel", autoComplete: "tel" },
];

export function DemoForm({ interest = "", interestLabel = "" }: { interest?: string; interestLabel?: string }) {
  const [channel, setChannel] = useState<Channel>(CHANNEL_EMAIL);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const choice = CHOICES.find((item) => item.value === channel) ?? CHOICES[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = demoSchema.safeParse({
      name: data.get(FIELD_NAME),
      channel: data.get(FIELD_CHANNEL),
      reach: data.get(FIELD_REACH),
      host: data.get(FIELD_HOST),
      message: data.get(FIELD_MESSAGE),
      interest,
    });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setSent(false);
      setError(fields.name?.[0] ?? fields.channel?.[0] ?? fields.reach?.[0] ?? fields.host?.[0] ?? fields.message?.[0] ?? DEMO_BAD);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(CONTACT_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; sent?: boolean } | null;
      if (!response.ok || body?.[FIELD_SENT] !== true) {
        setError(body?.error === apiError.busy ? DEMO_BUSY : body?.error === apiError.badBody ? DEMO_BAD : DEMO_ERROR);
        return;
      }
      setSent(true);
      setChannel(CHANNEL_EMAIL);
      form.reset();
    } catch {
      setError(DEMO_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border border-border bg-card p-6" noValidate>
      {interestLabel ? (
        <p className="text-sm text-muted-foreground">
          {DEMO_INTEREST} {interestLabel}
        </p>
      ) : null}
      <input type="hidden" name={FIELD_INTEREST} value={interest} />
      <div className="grid gap-2">
        <Label htmlFor={FIELD_NAME}>{DEMO_NAME}</Label>
        <Input id={FIELD_NAME} name={FIELD_NAME} autoComplete="name" className={fieldClass} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{DEMO_CHANNEL}</legend>
        <div className="flex flex-wrap gap-2">
          {CHOICES.map((item) => (
            <label key={item.value} className={`flex items-center gap-2 border px-3 py-2 text-sm ${channel === item.value ? "border-primary" : "border-border"}`}>
              <input
                type="radio"
                name={FIELD_CHANNEL}
                value={item.value}
                checked={channel === item.value}
                onChange={() => setChannel(item.value)}
                className="accent-primary"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={FIELD_REACH}>{choice.label}</Label>
        <Input id={FIELD_REACH} name={FIELD_REACH} type={choice.type} autoComplete={choice.autoComplete} placeholder={choice.hint || undefined} className={fieldClass} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={FIELD_HOST}>{DEMO_HOST}</Label>
        <Input id={FIELD_HOST} name={FIELD_HOST} placeholder={DEMO_HOST_HINT} className={fieldClass} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={FIELD_MESSAGE}>{DEMO_MESSAGE}</Label>
        <textarea
          id={FIELD_MESSAGE}
          name={FIELD_MESSAGE}
          rows={5}
          placeholder={DEMO_MESSAGE_HINT}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {error ? <p className="text-sm text-probe">{error}</p> : null}
      {sent ? <p className="text-sm">{DEMO_SENT}</p> : null}
      <Button type="submit" pending={pending} className="h-11 w-fit rounded-none px-4">
        {DEMO_SUBMIT}
      </Button>
    </form>
  );
}
