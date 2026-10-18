/**
 * Hidden cheats (owner request 2026-10-17, PROJECT.md 4b). Plain TypeScript,
 * no Phaser (ADR-006).
 *
 * Typing a secret word during play triggers its cheat. Nothing in the game
 * shows the words or that a cheat is on. A run that used one can't set the
 * high score (M7.2).
 *
 * Words must avoid the hotkey letters (P Q H F M, and W A S D for movement),
 * or typing them would pause, quit or move the ship.
 */

export type Cheat = 'lives' | 'invincible';

/** Keys the game already uses; a cheat word must not contain them. */
export const HOTKEY_LETTERS = 'PQHFMWASD';

/** Adds a typed letter; returns the cheat whose word was just completed, if any. */
export function typeLetter(
  buffer: string,
  letter: string,
  words: Readonly<Record<Cheat, string>>,
): { buffer: string; cheat: Cheat | null } {
  if (!/^[A-Z]$/.test(letter)) return { buffer: '', cheat: null }; // anything else breaks a word
  const longest = Math.max(...Object.values(words).map((w) => w.length));
  const next = (buffer + letter).slice(-longest);
  for (const [cheat, word] of Object.entries(words) as [Cheat, string][]) {
    if (next.endsWith(word)) return { buffer: '', cheat };
  }
  return { buffer: next, cheat: null };
}

/** Problems with a set of cheat words (empty = fine). */
export function checkWords(words: Readonly<Record<Cheat, string>>): string[] {
  const problems: string[] = [];
  for (const [cheat, word] of Object.entries(words)) {
    if (!/^[A-Z]{5,}$/.test(word)) problems.push(`${cheat}: use 5 or more capital letters`);
    const clash = [...word].filter((c) => HOTKEY_LETTERS.includes(c));
    if (clash.length)
      problems.push(`${cheat}: contains hotkey letters ${[...new Set(clash)].join('')}`);
  }
  return problems;
}
