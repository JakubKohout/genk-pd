import { describe, expect, it } from 'vitest';
import { parseCitizens, buildSearchUrl } from './parseCitizens';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<body>
<div hidden id="S:1">
  <div class="rounded-2xl">
    <table class="w-full text-sm text-left text-gray-400">
      <thead><tr><th>Křestní jméno</th><th>Příjmení</th><th>Datum narození</th><th>Pohlaví</th><th></th></tr></thead>
      <tbody>
        <tr class="bg-gray-800">
          <td class="w-1/5 px-6 py-3">Elizabeth</td>
          <td class="w-1/5 px-6 py-3">Woodward</td>
          <td class="w-1/5 px-6 py-3">05.12.2004</td>
          <td class="w-1/5 px-6 py-3">Žena</td>
          <td class="flex flex-1 justify-end items-center px-6 py-3">
            <div class="flex flex-row gap-1 items-center">
              <svg></svg>
              <a class="hover:underline" href="/police/citizens/1812">Podrobnosti</a>
            </div>
          </td>
        </tr>
        <tr class="bg-gray-800">
          <td class="w-1/5 px-6 py-3">Arthur</td>
          <td class="w-1/5 px-6 py-3">Woodward</td>
          <td class="w-1/5 px-6 py-3">17.05.1985</td>
          <td class="w-1/5 px-6 py-3">Muž</td>
          <td class="flex flex-1 justify-end items-center px-6 py-3">
            <div><a href="/police/citizens/34">Podrobnosti</a></div>
          </td>
        </tr>
        <tr class="bg-gray-800">
          <td class="w-1/5 px-6 py-3">Melanie</td>
          <td class="w-1/5 px-6 py-3">Woodward</td>
          <td class="w-1/5 px-6 py-3">21.07.2002</td>
          <td class="w-1/5 px-6 py-3">Žena</td>
          <td class="flex flex-1 justify-end items-center px-6 py-3">
            <div><a href="/police/citizens/671">Podrobnosti</a></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
`;

describe('parseCitizens', () => {
  it('extracts citizens from MDT view-source HTML', () => {
    const result = parseCitizens(SAMPLE_HTML);
    expect(result).toEqual([
      {
        id: '1812',
        firstName: 'Elizabeth',
        lastName: 'Woodward',
        dateOfBirth: '05.12.2004',
        detailUrl: 'https://mdt.genk.cz/police/citizens/1812',
      },
      {
        id: '34',
        firstName: 'Arthur',
        lastName: 'Woodward',
        dateOfBirth: '17.05.1985',
        detailUrl: 'https://mdt.genk.cz/police/citizens/34',
      },
      {
        id: '671',
        firstName: 'Melanie',
        lastName: 'Woodward',
        dateOfBirth: '21.07.2002',
        detailUrl: 'https://mdt.genk.cz/police/citizens/671',
      },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCitizens('')).toEqual([]);
    expect(parseCitizens('   ')).toEqual([]);
  });

  it('returns empty array for HTML without citizens table', () => {
    expect(parseCitizens('<html><body><p>nothing</p></body></html>')).toEqual([]);
  });

  it('deduplicates rows with the same citizen id', () => {
    const html = `
      <table><tbody>
        <tr><td>A</td><td>B</td><td>01.01.2000</td><td>x</td><td><a href="/police/citizens/1">d</a></td></tr>
        <tr><td>A</td><td>B</td><td>01.01.2000</td><td>x</td><td><a href="/police/citizens/1">d</a></td></tr>
      </tbody></table>`;
    const result = parseCitizens(html);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('1');
  });

  it('skips rows missing required fields', () => {
    const html = `
      <table><tbody>
        <tr><td></td><td>NoFirst</td><td>01.01.2000</td><td>x</td><td><a href="/police/citizens/1">d</a></td></tr>
        <tr><td>OK</td><td>Person</td><td>02.02.2000</td><td>x</td><td><a href="/police/citizens/2">d</a></td></tr>
        <tr><td>NoLink</td><td>Person</td><td>03.03.2000</td><td>x</td><td>no link</td></tr>
      </tbody></table>`;
    const result = parseCitizens(html);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('2');
  });
});

describe('buildSearchUrl', () => {
  it('builds view-source URL with encoded query', () => {
    expect(buildSearchUrl('Woodward')).toBe(
      'view-source:https://mdt.genk.cz/police/citizens?query=Woodward',
    );
  });

  it('encodes special chars and spaces', () => {
    expect(buildSearchUrl('John Doe')).toBe(
      'view-source:https://mdt.genk.cz/police/citizens?query=John%20Doe',
    );
  });

  it('trims whitespace', () => {
    expect(buildSearchUrl('  Woodward  ')).toBe(
      'view-source:https://mdt.genk.cz/police/citizens?query=Woodward',
    );
  });

  it('returns empty string for empty input', () => {
    expect(buildSearchUrl('')).toBe('');
    expect(buildSearchUrl('   ')).toBe('');
  });
});
