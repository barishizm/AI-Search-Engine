import Link from "next/link";
import { ArrowRight, Globe, History, Quote } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "Live web answers",
    text: "Every search runs against the live web through Google Search grounding — no stale index.",
  },
  {
    icon: Quote,
    title: "Cited, not invented",
    text: "Answers carry numbered citations you can click through to the original sources.",
  },
  {
    icon: History,
    title: "Your history, yours",
    text: "Conversations are saved to your private account and sync across devices.",
  },
];

export function Landing() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
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

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Ask the web anything.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground sm:text-lg">
            Limited Search gives you live, cited answers from an AI that
            actually searches — in your language.
          </p>

          <Link
            href="/auth/register"
            className="mt-8 block rounded-2xl border bg-card p-1.5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-[15px] text-muted-foreground">
                Ask anything…
              </span>
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>

          <div className="mt-16 grid gap-8 text-left sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="space-y-2">
                <feature.icon className="size-5 text-primary" />
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Powered by Gemini · Grounded with Google Search
      </footer>
    </div>
  );
}
