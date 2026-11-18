// Plain text helpers shared by the meter and the AI tics. No imports: the
// exported checker puts this file first in its script.

// numbers like "2:10" and "1.312" count as one word
export const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+|[:.,]\p{N}+)*/gu;
export const EMOJI = /\p{Extended_Pictographic}/gu;

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole-word match that works with accented letters
export const wordRe = (alternatives, flags = "giu") => new RegExp(`(?<![\\p{L}'’])(?:${alternatives.join("|")})(?![\\p{L}'’])`, flags);
export const count = (text, re) => (text.match(re) || []).length;

export function sentencesOf(text) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    // greeting lines ("Hi Marina,") are not sentences
    .filter((l) => l && !/,$/.test(l))
    .flatMap((l) => l.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter((s) => (s.match(WORD) || []).length > 0);
}
