"use client";

import { useState } from "react";
import { signIn, type SessionUser } from "@/features/sign-in/api";
import { apiError } from "@/shared/lib/api-error";
import { signInSchema } from "@/features/sign-in/schema";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const clearFields = { email: "", password: "" };

export function SignInForm({ onSignIn }: { onSignIn: (user: SessionUser) => void }) {
  const [error, setError] = useState("");
  const [fields, setFields] = useState(clearFields);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="relative grid max-w-sm gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const parsed = signInSchema.safeParse({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });
        if (!parsed.success) {
          const flat = parsed.error.flatten().fieldErrors;
          setFields({ email: flat.email?.[0] ?? "", password: flat.password?.[0] ?? "" });
          setError("");
          return;
        }
        setFields(clearFields);
        setPending(true);
        setError("");
        signIn(parsed.data.email, parsed.data.password)
          .then(onSignIn)
          .catch((reason: Error) => {
            const signInFailure: Record<string, string> = {
              [apiError.refused]: "That sign-in was refused.",
            };
            setError(signInFailure[reason.message] ?? "The dashboard did not answer.");
          })
          .finally(() => setPending(false));
      }}
    >
      <Label className="relative grid gap-1 text-muted-foreground">
        Email
        <Input
          name="email"
          type="email"
          autoComplete="username"
          disabled={pending}
          aria-invalid={fields.email !== ""}
          aria-describedby="sign-in-email-error"
        />
        <span id="sign-in-email-error" className="absolute top-full left-0 z-10 mt-0.5 text-xs leading-none text-destructive">
          {fields.email}
        </span>
      </Label>
      <Label className="relative grid gap-1 text-muted-foreground">
        Password
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={pending}
          aria-invalid={fields.password !== ""}
          aria-describedby="sign-in-password-error"
        />
        <span id="sign-in-password-error" className="absolute top-full left-0 z-10 mt-0.5 text-xs leading-none text-destructive">
          {fields.password}
        </span>
      </Label>
      <Button type="submit" className="w-fit" pending={pending}>
        Sign in
      </Button>
      <p className="absolute top-full left-0 mt-2 text-sm text-destructive">{error}</p>
    </form>
  );
}
