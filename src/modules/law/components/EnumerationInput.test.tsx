import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnumerationInput } from './EnumerationInput';
import type { LawEnumeration } from '../data/types';

const ALIAS: LawEnumeration = {
  id: 'e', source: 'lea', theme: 'paragrafy', prompt: 'p', kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'a', label: 'Maják', aliases: [] }],
};
const ORDER: LawEnumeration = {
  id: 'o', source: 'sasp', theme: 'hodnosti', prompt: 'p', kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'Captain', label: 'Captain' }, { key: 'Cadet', label: 'Cadet' }],
};

describe('EnumerationInput', () => {
  it('alias: adding all expected then submit is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value: 'Maják' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  });
  it('alias: a wrong entry yields not perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value: 'nesmysl' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  });
  it('ordered: correct order is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-order-input'), { target: { value: 'Captain\nCadet' } });
    fireEvent.click(screen.getByTestId('law-enum-order-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  });
  it('ordered: wrong order is not perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-order-input'), { target: { value: 'Cadet\nCaptain' } });
    fireEvent.click(screen.getByTestId('law-enum-order-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  });
});
