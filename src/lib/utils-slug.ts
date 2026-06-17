export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Secret"] as const;
export type Rarity = (typeof RARITIES)[number];

export function rarityClass(rarity?: string | null): string {
  switch ((rarity || "").toLowerCase()) {
    case "common": return "bg-rarity-common/15 text-rarity-common border-rarity-common/30";
    case "rare": return "bg-rarity-rare/15 text-rarity-rare border-rarity-rare/30";
    case "epic": return "bg-rarity-epic/15 text-rarity-epic border-rarity-epic/30";
    case "legendary": return "bg-rarity-legendary/15 text-rarity-legendary border-rarity-legendary/30";
    case "mythic": return "bg-rarity-mythic/15 text-rarity-mythic border-rarity-mythic/30";
    case "secret": return "bg-rarity-secret/15 text-rarity-secret border-rarity-secret/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
