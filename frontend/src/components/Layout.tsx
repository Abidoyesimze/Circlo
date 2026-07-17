import { Link, Outlet, useLocation } from "react-router-dom";
import { Circle, MessageSquareText, Menu } from "lucide-react";
import * as React from "react";

import { WalletButton, WrongNetworkBanner } from "@/components/WalletButton";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { Button } from "@/components/ui/button";
import { FEEDBACK_FORM_URL } from "@/config";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/Abidoyesimze/Circlo";

export function Layout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => setMobileNavOpen(false), [location.pathname]);

  const navLinks = [
    { to: "/app", label: "Dashboard" },
    { to: "/app/create", label: "Create a Circle" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <WrongNetworkBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Circle className="size-6 text-primary" strokeWidth={2.5} />
            <span>Circlo</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  location.pathname === link.to && "bg-secondary text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <WalletButton />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    location.pathname === link.to && "bg-secondary text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 sm:hidden">
                <WalletButton />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} Circlo &mdash; built on Stellar.</p>
          <div className="flex items-center gap-4">
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <MessageSquareText className="size-4" />
              Feedback
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
