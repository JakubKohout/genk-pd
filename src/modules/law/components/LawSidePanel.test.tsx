import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProgressEntry } from '@/shared/storage';
import type { LawPanelItem } from './LawSidePanel';
import { LawSidePanel } from './LawSidePanel';

const ITEMS: LawPanelItem[] = [
  { id: 'q1', source: 'lea', theme: 'pojmy', label: 'Co je LEA §7?' },
  { id: 'q2', source: 'penal', theme: 'paragrafy', label: 'Co je penal §1?' },
  { id: 'q3', source: 'sasp', theme: 'rto', label: 'Jaký je kanál RTO?' },
];

const PROGRESS: Record<string, ProgressEntry> = {
  q1: { score: 2, lastAskedAtTurn: 0 },
  q2: { score: 0, lastAskedAtTurn: 1 },
  q3: { score: -1, lastAskedAtTurn: 2 },
};

const SOURCE_FILTER = { lea: true, penal: true, sasp: true };
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
};

describe('<LawSidePanel />', () => {
  it('renders law-progress-percent', () => {
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
      />,
    );
    // q1 score=2 → clamp 2, q2 score=0 → 0, q3 score=-1 → clamp 0
    // pct = (2+0+0)/(2*3) = 2/6 = 33%
    expect(screen.getByTestId('law-progress-percent')).toBeInTheDocument();
    expect(screen.getByTestId('law-progress-percent').textContent).toBe('33%');
  });

  it('renders law-progress-bar', () => {
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
      />,
    );
    expect(screen.getByTestId('law-progress-bar')).toBeInTheDocument();
  });

  it('fires onSetSource when source checkbox toggled', async () => {
    const user = userEvent.setup();
    const onSetSource = vi.fn();
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={onSetSource}
        onSetTheme={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId('law-filter-source-lea'));
    expect(onSetSource).toHaveBeenCalledWith('lea', false);
  });

  it('fires onSetTheme when theme checkbox toggled', async () => {
    const user = userEvent.setup();
    const onSetTheme = vi.fn();
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={onSetTheme}
      />,
    );
    await user.click(screen.getByTestId('law-filter-theme-rto'));
    expect(onSetTheme).toHaveBeenCalledWith('rto', false);
  });

  it('fires onSelect when chip clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByTestId('chip-q1'));
    expect(onSelect).toHaveBeenCalledWith('q1');
  });

  it('filters out items whose source is disabled', () => {
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={{ lea: false, penal: true, sasp: true }}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('chip-q1')).not.toBeInTheDocument();
    expect(screen.getByTestId('chip-q2')).toBeInTheDocument();
  });

  it('filters out items whose theme is disabled', () => {
    const themeFilter = { ...THEME_FILTER, rto: false };
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={themeFilter}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('chip-q3')).not.toBeInTheDocument();
    expect(screen.getByTestId('chip-q1')).toBeInTheDocument();
  });

  it('shows checkmark on mastered chip', () => {
    render(
      <LawSidePanel
        items={ITEMS}
        progress={PROGRESS}
        sourceFilter={SOURCE_FILTER}
        themeFilter={THEME_FILTER}
        onSetSource={vi.fn()}
        onSetTheme={vi.fn()}
      />,
    );
    const chip = screen.getByTestId('chip-q1');
    expect(chip.getAttribute('data-done')).toBe('true');
  });
});
