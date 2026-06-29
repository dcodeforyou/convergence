"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Press_Start_2P, Space_Grotesk } from "next/font/google";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

const spaceG = Space_Grotesk({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const NAV_ITEMS = [
  { label: "Studio",  href: "/studio"  },
  { label: "Archive", href: "#"        },
  { label: "Contact", href: "/contact" },
];

function NavItem({ label, href, active }: { label: string; href: string; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  const lit = active || hovered;

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={spaceG.className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: "clamp(9px, 2.2vw, 12px)",
        fontWeight: active ? 500 : 400,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: lit ? "#C8FF00" : "rgba(240,237,230,0.52)",
        textShadow: lit
          ? "0 0 8px #C8FF00, 0 0 20px rgba(200,255,0,0.5), 0 0 40px rgba(200,255,0,0.18)"
          : "none",
        transition: "color 0.18s ease, text-shadow 0.22s ease",
        textDecoration: "none",
        whiteSpace: "nowrap",
        position: "relative",
      }}
    >
      {/* › marker: always visible when active, appears on hover */}
      <span style={{
        display: "inline-block",
        color: "#C8FF00",
        textShadow: "0 0 8px #C8FF00, 0 0 18px rgba(200,255,0,0.6)",
        opacity: lit ? 1 : 0,
        transform: lit ? "translateX(0)" : "translateX(-5px)",
        transition: "opacity 0.14s ease, transform 0.18s ease",
        width: 9,
        flexShrink: 0,
        fontSize: 11,
      }}>
        ›
      </span>
      {label}
      {/* Active underline dot */}
      {active && (
        <span style={{
          position: "absolute",
          bottom: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 3,
          height: 3,
          borderRadius: "50%",
          backgroundColor: "#C8FF00",
          boxShadow: "0 0 6px #C8FF00, 0 0 12px rgba(200,255,0,0.5)",
        }} />
      )}
    </a>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{ padding: "clamp(16px, 4vw, 28px) clamp(16px, 5vw, 40px)" }}
    >
      {/* Brand */}
      <a
        href="/"
        className={pixel.className}
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "#C8FF00",
          textShadow: "0 0 8px #C8FF00, 0 0 18px rgba(200,255,0,0.45), 0 0 36px rgba(200,255,0,0.18)",
          textDecoration: "none",
        }}
      >
        CVRGNC
      </a>

      {/* Nav items */}
      <ul className="flex items-center" style={{ gap: "clamp(14px, 3.5vw, 36px)", listStyle: "none", margin: 0, padding: 0 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href !== "#" && (
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          );
          return (
            <li key={item.label}>
              <NavItem label={item.label} href={item.href} active={active} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
