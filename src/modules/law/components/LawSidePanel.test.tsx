import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProgressEntry } from '@/shared/storage';
import type { LawPanelItem } from './LawSidePanel';
import { LawSidePanel } from './LawSidePanel';

const ITEMS: LawPanelItem[] = [
  { id: 'q1', theme: 'pojmy', label: 'Prokázání příslušnosti' },
  { id: 'q2', theme: 'paragrafy', label: 'Krádež vozidla' },
  { id: 'q3', theme: 'rto', label: 'Rádiový kanál' },
];

const PROGRESS: Record<string, ProgressEntry> = {
  q1: { score: 2, lastAskedAtTurn: 0 },
  q2: { score: 0, lastAskedAtTurn: 1 },
  q3: { score: -1, lastAskedAtTurn: 2 },
};

const THEME_FILTER = {
  pojmy: true,
  hodnosti: true,
  jednani: true,
  rto: true,
  vybava: true,
  zasah: true,
  zadrzeni: true,
  kriminalistika: true,
  paragrafy: true,
  scenky: true,
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof LawSidePanel>> = {}) {
  return render(
    <LawSidePanel
      items={ITEMS}
      progress={PROGRESS}
      themeFilter={THEME_FILTER}
      onSetTheme={vi.fn()}
      {...overrides}
    />,
  );
}

describe('<LawSidePanel />', () => {
  it('renders global progress percent (33%)', () => {
    renderPanel();
    expect(screen.getByTestId('law-progress-percent').textContent).toBe('33%');
  });

  it('renders global progress bar', () => {
    renderPanel();
    expect(screen.getByTestId('law-progress-bar')).toBeInTheDocument();
  });

  it('renders one group header per non-empty filtered theme', () => {
    renderPanel();
    expect(screen.getByTestId('law-group-pojmy')).toBeInTheDocument();
    expect(screen.getByTestId('law-group-paragrafy')).toBeInTheDocument();
    expect(screen.getByTestId('law-group-rto')).toBeInTheDocument();
    expect(screen.queryByTestId('law-group-hodnosti')).not.toBeInTheDocument();
  });

  it('group header shows mastered/total count', () => {
    renderPanel();
    expect(screen.getByTestId('law-group-pojmy')).toHaveTextContent('1/1');
  });

  it('groups are collapsed by default (chips not rendered)', () => {
    renderPanel();
    expect(screen.queryByTestId('chip-q1')).not.toBeInTheDocument();
  });

  it('clicking a group header expands it (chips appear)', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('law-group-pojmy'));
    expect(screen.getByTestId('chip-q1')).toBeInTheDocument();
  });

  it('auto-expands the group containing currentId', () => {
    renderPanel({ currentId: 'q2' });
    expect(screen.getByTestId('chip-q2')).toBeInTheDocument();
    expect(screen.queryByTestId('chip-q1')).not.toBeInTheDocument();
  });

  it('chip shows mastered data-done', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('law-group-pojmy'));
    expect(screen.getByTestId('chip-q1').getAttribute('data-done')).toBe('true');
  });

  it('fires onSelect when an expanded chip is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderPanel({ onSelect });
    await user.click(screen.getByTestId('law-group-pojmy'));
    await user.click(screen.getByTestId('chip-q1'));
    expect(onSelect).toHaveBeenCalledWith('q1');
  });

  it('fires onSetTheme when theme checkbox toggled', async () => {
    const user = userEvent.setup();
    const onSetTheme = vi.fn();
    renderPanel({ onSetTheme });
    await user.click(screen.getByTestId('law-filter-theme-rto'));
    expect(onSetTheme).toHaveBeenCalledWith('rto', false);
  });

  it('renders the scenky theme checkbox, checked by default', () => {
    renderPanel();
    expect(screen.getByTestId('law-filter-theme-scenky')).toBeChecked();
  });

  it('hides a group whose theme is disabled', () => {
    renderPanel({ themeFilter: { ...THEME_FILTER, rto: false } });
    expect(screen.queryByTestId('law-group-rto')).not.toBeInTheDocument();
    expect(screen.getByTestId('law-group-pojmy')).toBeInTheDocument();
  });

  it('renders a mini progress bar per group', () => {
    renderPanel();
    expect(screen.getByTestId('law-group-pojmy-bar')).toBeInTheDocument();
  });
});
