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
  email: z.string().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

export default function LoginPage() {
  const { signIn, signInGoogle } = useStore();
  const router = useRouter();
  const [err, setErr] = useState("");
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="mx-auto max-w-md pt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e4572e]">おかえり · Welcome back</p>
      <h1 className="serif mt-2 text-4xl text-zinc-50">Your story kept going.</h1>
      <form
        className="mt-8 space-y-3"
        onSubmit={handleSubmit(async (v) => {
          setErr("");
          try {
            await signIn(v.email, v.password);
            router.push("/home");
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not log you in.");
          }
        })}
      >
        <div>
          <label htmlFor="li-e" className="text-xs text-zinc-400">Email or username</label>
          <Input id="li-e" {...register("email")} placeholder="you@example.com" autoComplete="username" />
        </div>
        <div>
          <label htmlFor="li-p" className="text-xs text-zinc-400">Password</label>
          <Input id="li-p" type="password" {...register("password")} placeholder="••••••••" autoComplete="current-password" />
        </div>
        {err && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
        <Button className="w-full py-3" disabled={formState.isSubmitting}>Log in</Button>
      </form>
      <Button
        variant="outline"
        className="mt-3 w-full py-3"
        onClick={async () => {
          await signInGoogle();
          router.push("/home");
        }}
      >
        Continue with Google
      </Button>
      <p className="mt-6 text-center text-sm text-zinc-500">
        New here? <Link href="/signup" className="text-zinc-100 underline underline-offset-4">Start your Kairoku</Link>
      </p>
    </div>
  );
}
