export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const RARITIES = ["Common", "Uncommon", "Rare", "Ultra-rare"] as const;
export type Rarity = (typeof RARITIES)[number];

export function rarityClass(rarity?: string | null): string {
  switch ((rarity || "").toLowerCase()) {
    case "common": return "bg-rarity-common/15 text-rarity-common border-rarity-common/30";
    case "uncommon": return "bg-rarity-uncommon/15 text-rarity-uncommon border-rarity-uncommon/30";
    case "rare": return "bg-rarity-rare/15 text-rarity-rare border-rarity-rare/30";
    case "ultra-rare":
    case "ultra rare":
    case "ultrarare": return "bg-rarity-ultra/15 text-rarity-ultra border-rarity-ultra/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
