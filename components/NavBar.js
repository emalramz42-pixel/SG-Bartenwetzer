"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Abstimmen" },
  { href: "/bestenliste", label: "Bestenliste" },
  { href: "/verlauf", label: "Verlauf" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar">
      <div className="inner">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={"tabbtn" + (pathname === t.href ? " active" : "")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
