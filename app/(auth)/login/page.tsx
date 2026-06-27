"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Label, toast } from "bruv-ui";
import { signIn, signUp } from "@/lib/auth-client";
import { GithubMark } from "@/components/github-mark";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onGithub() {
    await signIn.social({ provider: "github", callbackURL: redirectTo });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res =
        mode === "signin"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name: name || email });
      if (res.error) {
        throw new Error(res.error.message ?? "Authentication failed");
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <Card.Content>
        <Card.Header>
          <div className="text-foreground font-semibold lowercase">bruv</div>
          <p className="text-muted-foreground text-sm">
            {mode === "signin" ? "sign in to continue" : "create your account"}
          </p>
        </Card.Header>
        <form onSubmit={onSubmit}>
          <Card.Body className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              iconLeft={<GithubMark className="size-4" />}
              onClick={onGithub}
            >
              continue with github
            </Button>
          <div className="flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <div className="bg-border h-px flex-1" />
          </div>
          {mode === "signup" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          </Card.Body>
          <Card.Section className="mt-4 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "signin" ? "sign in" : "sign up"}
            </Button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "need an account? sign up"
                : "have an account? sign in"}
            </button>
          </Card.Section>
        </form>
      </Card.Content>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
