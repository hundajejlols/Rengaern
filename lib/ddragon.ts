// Data Dragon — publiczne assety championów (bez klucza API).
// Wersję cache'ujemy w pamięci procesu, żeby nie odpytywać przy każdym żądaniu.

let cachedVersion: { value: string; fetchedAt: number } | null = null;
const VERSION_TTL_MS = 60 * 60 * 1000; // 1h

export async function getLatestDdragonVersion(): Promise<string> {
  if (cachedVersion && Date.now() - cachedVersion.fetchedAt < VERSION_TTL_MS) {
    return cachedVersion.value;
  }
  try {
    const res = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
      { next: { revalidate: 3600 } },
    );
    const versions: string[] = await res.json();
    const value = versions[0] ?? "14.1.1";
    cachedVersion = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return cachedVersion?.value ?? "14.1.1";
  }
}

export function championIconUrl(version: string, championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

export function itemIconUrl(version: string, itemId: number): string | null {
  if (!itemId) return null; // 0 = pusty slot
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

// --- Czary przywoływacza: mapa numericId -> plik ikony (cache w procesie). ---
let spellMap: { version: string; map: Map<number, string> } | null = null;

export async function getSummonerSpellIcon(
  version: string,
  spellId: number,
): Promise<string | null> {
  if (!spellMap || spellMap.version !== version) {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`,
      { next: { revalidate: 86400 } },
    );
    const json = (await res.json()) as {
      data: Record<string, { key: string; image: { full: string } }>;
    };
    const map = new Map<number, string>();
    for (const s of Object.values(json.data)) {
      map.set(Number(s.key), s.image.full);
    }
    spellMap = { version, map };
  }
  const file = spellMap.map.get(spellId);
  return file
    ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${file}`
    : null;
}

// --- Runy: mapy perkId -> ikona oraz styleId -> ikona (cache w procesie). ---
let runeData: {
  version: string;
  perks: Map<number, string>;
  styles: Map<number, string>;
} | null = null;

async function ensureRuneData(version: string) {
  if (runeData && runeData.version === version) return runeData;
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`,
    { next: { revalidate: 86400 } },
  );
  const json = (await res.json()) as Array<{
    id: number;
    icon: string;
    slots: Array<{ runes: Array<{ id: number; icon: string }> }>;
  }>;
  const perks = new Map<number, string>();
  const styles = new Map<number, string>();
  for (const style of json) {
    styles.set(style.id, style.icon);
    for (const slot of style.slots) {
      for (const rune of slot.runes) perks.set(rune.id, rune.icon);
    }
  }
  runeData = { version, perks, styles };
  return runeData;
}

function ddragonImg(path: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/${path}`;
}

export async function getRuneIcon(
  version: string,
  perkId: number,
): Promise<string | null> {
  const data = await ensureRuneData(version);
  const icon = data.perks.get(perkId);
  return icon ? ddragonImg(icon) : null;
}

export async function getRuneStyleIcon(
  version: string,
  styleId: number,
): Promise<string | null> {
  const data = await ensureRuneData(version);
  const icon = data.styles.get(styleId);
  return icon ? ddragonImg(icon) : null;
}
