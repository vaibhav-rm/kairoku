import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "soft";
}) {
  const styles = {
    primary:
      "bg-[#e4572e] hover:bg-[#cf4a24] text-white shadow-[0_8px_30px_-8px_rgba(228,87,46,0.6)]",
    ghost: "hover:bg-white/10 text-zinc-200",
    outline: "border border-white/15 hover:border-white/30 hover:bg-white/5 text-zinc-100",
    soft: "bg-white/10 hover:bg-white/15 text-zinc-100",
  } as const;
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer max-sm:min-h-11",
        styles[variant],
        className
      )}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[#e4572e]/60 focus:ring-2 focus:ring-[#e4572e]/20 transition",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[#e4572e]/60 focus:ring-2 focus:ring-[#e4572e]/20 transition min-h-[120px] resize-y",
        props.className
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-[#171412]/90", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300", className)}>
      {children}
    </span>
  );
}

export function Stars({
  value,
  onRate,
  size = 18,
  label = "Rating",
}: {
  value: number;
  onRate?: (v: number) => void;
  size?: number;
  label?: string;
}) {
  const interactive = !!onRate;
  return (
    <div className={cn("flex w-fit items-center", interactive ? "-m-2 gap-0" : "gap-1")} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            disabled={!interactive}
            onClick={() => {
              if (!onRate) return;
              // click toggles full; shift/alt-click or second click gives half
              if (value === i) onRate(i - 0.5);
              else onRate(i);
            }}
            onContextMenu={(e) => {
              if (onRate) {
                e.preventDefault();
                onRate(i - 0.5);
              }
            }}
            className={cn(
              "transition-transform",
              interactive
                ? "grid cursor-pointer place-items-center p-2 hover:scale-110 active:scale-95"
                : "cursor-default"
            )}
          >
            {half ? (
              <span className="relative inline-block" style={{ width: size, height: size }}>
                <Star size={size} className="absolute inset-0 text-zinc-700" fill="currentColor" />
                <StarHalf size={size} className="absolute inset-0 text-amber-400" fill="currentColor" />
              </span>
            ) : (
              <Star
                size={size}
                className={filled ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "text-zinc-700"}
                fill="currentColor"
              />
            )}
          </button>
        );
      })}
      <span className="ml-1 text-xs text-zinc-500 tabular-nums">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export function ProgressBar({ value, total }: { value: number; total?: number | null }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#e4572e] to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.07]", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
      <p className="font-serif text-xl text-zinc-100">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return <Stars value={value} size={size} />;
}
