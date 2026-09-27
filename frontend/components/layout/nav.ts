export type NavKey = "about" | "boards" | "signIn" | "signUp";

export type NavItem = {
  key: NavKey;
  href: "/" | "/boards" | "/auth/sign-in" | "/auth/sign-up";
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "about", href: "/" },
  { key: "boards", href: "/boards" },
];

export const AUTH_ITEMS: readonly NavItem[] = [
  { key: "signIn", href: "/auth/sign-in" },
  { key: "signUp", href: "/auth/sign-up" },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
