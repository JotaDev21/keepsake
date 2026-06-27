/** A short, collision-resistant token for media filenames (not a DB id). */
export function token(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
