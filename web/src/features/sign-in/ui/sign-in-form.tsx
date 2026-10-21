"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type Role = "admin" | "user";

export function SignInForm({ onSignIn }: { onSignIn: (role: Role) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid max-w-sm gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "").trim().toLowerCase();
        if (email === "admin@ledgesec.com") {
          setError("");
          onSignIn("admin");
          return;
        }
        if (email === "iris@example.com") {
          setError("");
          onSignIn("user");
          return;
        }
        setError("That sign-in was refused.");
      }}
    >
      <Label className="grid gap-1 text-muted-foreground">
        Email
        <Input name="email" type="email" autoComplete="username" required />
      </Label>
      <Label className="grid gap-1 text-muted-foreground">
        Password
        <Input name="password" type="password" autoComplete="current-password" required />
      </Label>
      <Button type="submit" className="w-fit">Sign in</Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-sm text-muted-foreground">
        Preview only. admin@ledgesec.com sees addresses. iris@example.com sees one site, without addresses.
      </p>
    </form>
  );
}
