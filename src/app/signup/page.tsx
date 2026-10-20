"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@/lib/store";
import { Button, Input } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

export default function SignupPage() {
  const { signUp, signInGoogle } = useStore();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="mx-auto max-w-md pt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e4572e]">はじめよう · Begin</p>
      <h1 className="serif mt-2 text-4xl text-zinc-50">Start your Kairoku.</h1>
      <p className="mt-2 text-sm text-zinc-400">One account. Every story you&apos;ll ever watch.</p>
      <form
        className="mt-8 space-y-3"
        onSubmit={handleSubmit(async (v) => {
          setErr("");
          try {
            await signUp(v.email, v.password);
            router.push("/onboarding");
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Something went wrong.");
          }
        })}
      >
        <div>
          <label htmlFor="su-e" className="text-xs text-zinc-400">Email</label>
          <Input id="su-e" type="email" {...register("email")} placeholder="you@example.com" autoComplete="email" />
          {formState.errors.email && <p className="mt-1 text-xs text-red-400">{formState.errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="su-p" className="text-xs text-zinc-400">Password</label>
          <Input id="su-p" type="password" {...register("password")} placeholder="••••••••" autoComplete="new-password" />
          {formState.errors.password && <p className="mt-1 text-xs text-red-400">{formState.errors.password.message}</p>}
        </div>
        {err && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
        <Button className="w-full py-3" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating…" : "Create account"}
        </Button>
      </form>
      <Button
        variant="outline"
        className="mt-3 w-full py-3"
        disabled={googleBusy}
        onClick={async () => {
          setErr("");
          setGoogleBusy(true);
          try {
            const isNew = await signInGoogle();
            router.push(isNew ? "/onboarding" : "/home");
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not sign you in.");
          } finally {
            setGoogleBusy(false);
          }
        }}
      >
        {googleBusy ? "Opening Google…" : "Continue with Google"}
      </Button>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have one? <Link href="/login" className="text-zinc-100 underline underline-offset-4">Log in</Link>
      </p>
    </div>
  );
}
