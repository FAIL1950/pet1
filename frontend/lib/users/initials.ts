/** Avatar fallback: first letters of up to two name words, or the email's first letter. */
export function initials({ name, email }: { name: string; email: string }): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.charAt(0).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
