"use client";

import { useState } from "react";
import { signIn, type SessionUser } from "@/features/sign-in/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function SignInForm({ onSignIn }: { onSignIn: (user: SessionUser) => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid max-w-sm gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "");
        const password = String(data.get("password") ?? "");
        setPending(true);
        setError("");
        signIn(email, password)
          .then(onSignIn)
          .catch((reason: Error) => {
            setError(reason.message === "refused" ? "That sign-in was refused." : "The dashboard did not answer.");
          })
          .finally(() => setPending(false));
      }}
    >
      <Label className="grid gap-1 text-muted-foreground">
        Email
        <Input name="email" type="email" autoComplete="username" required disabled={pending} />
      </Label>
      <Label className="grid gap-1 text-muted-foreground">
        Password
        <Input name="password" type="password" autoComplete="current-password" required disabled={pending} />
      </Label>
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
