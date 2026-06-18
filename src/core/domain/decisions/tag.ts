// A tag a board allows. A decision may only carry tags from its board's set.

export interface Tag {
  id: string;
  boardId: string;
  /** Normalized lowercase, no leading `#`. */
  name: string;
}

/**
 * Normalize a raw tag string the way the board's allowed set stores it:
 * trimmed, lowercased, with any leading `#` removed. Pure rule shared by the
 * create path and the seed so comparisons are apples-to-apples.
 */
export function normalizeTagName(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#+/, "");
}
