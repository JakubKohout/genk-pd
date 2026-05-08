export interface MdtCitizen {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  detailUrl: string;
}

const MDT_BASE = 'https://mdt.genk.cz';

export function parseCitizens(html: string): MdtCitizen[] {
  if (!html.trim()) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('table tbody tr');
  const seen = new Set<string>();
  const result: MdtCitizen[] = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) return;

    const firstName = cells[0]?.textContent?.trim() ?? '';
    const lastName = cells[1]?.textContent?.trim() ?? '';
    const dateOfBirth = cells[2]?.textContent?.trim() ?? '';

    const link = row.querySelector<HTMLAnchorElement>('a[href*="/police/citizens/"]');
    const href = link?.getAttribute('href') ?? '';
    const idMatch = href.match(/\/police\/citizens\/([^/?#]+)/);
    const id = idMatch?.[1] ?? '';

    if (!firstName || !lastName || !id) return;
    if (seen.has(id)) return;
    seen.add(id);

    result.push({
      id,
      firstName,
      lastName,
      dateOfBirth,
      detailUrl: `${MDT_BASE}/police/citizens/${id}`,
    });
  });

  return result;
}

export function buildSearchUrl(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '';
  return `view-source:${MDT_BASE}/police/citizens?query=${encodeURIComponent(trimmed)}`;
}
