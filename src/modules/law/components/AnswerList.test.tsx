import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerList, type AnswerEntry } from './AnswerList';

const baseEntries: AnswerEntry[] = [
  { key: '1', status: 'correct', text: 'maják', meta: '§16 B 3b' },
  { key: '2', status: 'wrong', text: 'blbost', meta: 'žádná shoda' },
];

describe('AnswerList', () => {
  it('renders nothing when entries are empty', () => {
    const { container } = render(<AnswerList entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one row per entry', () => {
    render(<AnswerList entries={baseEntries} onRemove={() => {}} />);
    expect(screen.getAllByTestId(/chip-/)).toHaveLength(2);
  });

  it('forwards remove with the entry key', () => {
    const onRemove = vi.fn();
    render(<AnswerList entries={baseEntries} onRemove={onRemove} />);
    fireEvent.click(screen.getAllByRole('button', { name: /odebrat/i })[1]);
    expect(onRemove).toHaveBeenCalledWith('2');
  });

  it('omits remove buttons when onRemove is not provided', () => {
    render(<AnswerList entries={baseEntries} />);
    expect(screen.queryAllByRole('button', { name: /odebrat/i })).toHaveLength(0);
  });

  it('renders "Zapomněl jsi:" divider before missed entries when requested', () => {
    const entries: AnswerEntry[] = [
      { key: '1', status: 'correct', text: 'maják', meta: '§16 B 3b' },
      { key: '2', status: 'missed', text: 'gestem', meta: '§16 B 5b' },
    ];
    render(<AnswerList entries={entries} showMissedHeading />);
    expect(screen.getByText('Zapomněl jsi:')).toBeInTheDocument();
  });

  it('does not render divider if first entry is missed (no preceding rows)', () => {
    const entries: AnswerEntry[] = [
      { key: '1', status: 'missed', text: 'gestem', meta: '§16 B 5b' },
    ];
    render(<AnswerList entries={entries} showMissedHeading />);
    expect(screen.queryByText('Zapomněl jsi:')).toBeNull();
  });

  it('does not render divider when showMissedHeading is false', () => {
    const entries: AnswerEntry[] = [
      { key: '1', status: 'correct', text: 'maják', meta: '§16 B 3b' },
      { key: '2', status: 'missed', text: 'gestem', meta: '§16 B 5b' },
    ];
    render(<AnswerList entries={entries} />);
    expect(screen.queryByText('Zapomněl jsi:')).toBeNull();
  });
});
