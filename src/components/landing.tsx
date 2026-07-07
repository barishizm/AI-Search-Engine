import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const features = [
  {
    label: "Live",
    text: "Every search runs against the live web through Google Search grounding — no stale index.",
  },
  {
    label: "Cited",
    text: "Answers carry numbered citations you can click through to the original sources.",
  },
  {
    label: "Yours",
    text: "Conversations are saved to your private account and sync across devices.",
  },
];

export function Landing() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/register">Get started</Link>
          </Button>
        </div>
      </nav>

      <main className="flex flex-1 flex-col justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Ask the web anything.
          </h1>
          <p className="mt-4 max-w-md text-pretty text-muted-foreground sm:text-lg">
            Limited Search gives you live, cited answers from an AI that
            actually searches — in your language.
          </p>

          <Link
            href="/auth/register"
            className="mt-8 block max-w-md rounded-lg border bg-card p-1.5 text-left transition-colors hover:border-ring"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-[15px] text-muted-foreground">
                Ask anything…
              </span>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>

          <dl className="mt-16">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="grid grid-cols-[5rem_1fr] gap-4 border-t py-4 first:border-t"
              >
                <dt className="text-sm font-medium text-foreground">
                  {feature.label}
                </dt>
                <dd className="text-sm leading-6 text-muted-foreground">
                  {feature.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Powered by Gemini · Grounded with Google Search
      </footer>
    </div>
  );
}
