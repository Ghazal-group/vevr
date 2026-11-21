import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  ArrowLeftRight,
  Wallet,
  Boxes,
  ScanLine,
  UsersRound,
  Files,
  Landmark,
  ChartColumn,
  Calculator,
  Activity,
  Settings,
  Sparkles,
  ChevronDown,
  Building2,
  Search,
  Bell,
  Menu,
  ArrowUpRight,
  Layers3,
  BookOpen,
  Command,
  Check,
} from "lucide-react";
import { Dialog } from "./Editor";
export const sections = [
  {
    label: "Commerce",
    icon: Layers3,
    links: [
      [ShoppingBag, "Sales"],
      [ScanLine, "Point of Sale"],
      [Boxes, "Inventory"],
      [UsersRound, "Customers"],
      [Files, "Invoices & Quotes"],
    ],
  },
  {
    label: "Money",
    icon: Wallet,
    links: [
      [ArrowLeftRight, "Transactions"],
      [Wallet, "Expenses"],
      [Landmark, "Banking & Payments"],
    ],
  },
  {
    label: "Insights",
    icon: ChartColumn,
    links: [
      [ChartColumn, "Reports"],
      [Calculator, "Tax Centre"],
      [Activity, "Financial Health"],
    ],
  },
];
const direct = [
  [LayoutDashboard, "Overview"],
  [Sparkles, "AI Assistant"],
  [Settings, "Settings"],
];
export const destinations = [...direct, ...sections.flatMap((g) => g.links)];
export function pageIcon(name: string) {
  return (destinations.find(([, n]) => n === name)?.[0] ||
    LayoutDashboard) as typeof LayoutDashboard;
}
export function WorkspaceNav({
  businesses,
  biz,
  change,
  name,
  section,
  jump,
  pop,
  directory,
  showDirectory,
  alerts,
}: any) {
  const [menu, M] = useState(""),
    root = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) M("");
    };
    const keys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        M("");
        pop("Search");
      }
      if (e.key === "Escape" && menu) {
        M("");
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keys);
    };
  }, [menu, pop]);
  function visit(k: string) {
    M("");
    showDirectory(false);
    jump(k);
    requestAnimationFrame(() =>
      document
        .getElementById("workspace-content")
        ?.focus({ preventScroll: true }),
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function item([Icon, k]: any) {
    return (
      <button
        key={k}
        aria-current={k === section ? "page" : undefined}
        className={k === section ? "chosen" : ""}
        onClick={() => visit(k)}
      >
        <Icon size={17} />
        <span>{k}</span>
      </button>
    );
  }
  return (
    <>
      <a
        className="skiplink"
        href="#workspace-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("workspace-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="workmast">
        <div className="workwrap mastrow">
          <button
            className="brandhome"
            aria-label="VEVR overview"
            onClick={() => visit("Overview")}
          >
            <img src="/logo.png" alt="vevr" />
          </button>
          <span className="mastseparator" />
          <label className="workspacepick">
            <Building2 size={17} />
            <select
              aria-label="Switch business"
              value={biz}
              onChange={(e) => {
                M("");
                change(+e.target.value);
              }}
            >
              {businesses.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <div className="masttools">
            <button
              className="globalsearch"
              title="Search workspace (Ctrl or Command + K)"
              aria-label="Search workspace"
              onClick={() => {
                M("");
                pop("Search");
              }}
            >
              <Search size={16} />
              <span>Search workspace</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </button>
            <button
              className="utilityicon"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => {
                M("");
                pop("Notifications");
              }}
            >
              <Bell size={18} />
              {alerts > 0 && <i />}
            </button>
            <button
              className="profilebtn"
              title="User profile"
              aria-label="User profile"
              onClick={() => {
                M("");
                pop("Profile");
              }}
            >
              {name.trim().slice(0, 1).toUpperCase()}
            </button>
          </div>
        </div>
      </header>
      <nav
        ref={root}
        className="worknav"
        aria-label="Workspace navigation"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) M("");
        }}
      >
        <div className="workwrap navrow">
          {item(direct[0])}
          {sections.map(({ label, icon: Icon, links }) => (
            <div className="navgroup" key={label}>
              <button
                aria-expanded={menu === label}
                aria-controls={"links-" + label}
                className={links.some(([, n]) => n === section) ? "chosen" : ""}
                onClick={(e) => {
                  trigger.current = e.currentTarget;
                  M(menu === label ? "" : label);
                }}
              >
                <Icon size={17} />
                {label}
                <ChevronDown size={13} />
              </button>
              {menu === label && (
                <div className="navlist" id={"links-" + label}>
                  <small>{label.toUpperCase()}</small>
                  {links.map(item)}
                </div>
              )}
            </div>
          ))}
          {item(direct[2])}
          <span className="navspace" />
          {item(direct[1])}
        </div>
      </nav>
      <nav className="mobilebar" aria-label="Mobile navigation">
        {item(direct[0])}
        {item([ScanLine, "Point of Sale"])}
        {item([Boxes, "Inventory"])}
        <button onClick={() => showDirectory(true)} aria-expanded={directory}>
          <Menu size={18} />
          More
        </button>
      </nav>
      {directory && (
        <Dialog title="Workspace navigation" close={() => showDirectory(false)}>
          <div className="directory">
            {direct.map(item)}
            {sections.map(({ label, links }) => (
              <div key={label}>
                <small className="kicker">{label}</small>
                {links.map(item)}
              </div>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
