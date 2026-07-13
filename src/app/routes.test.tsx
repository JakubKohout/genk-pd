import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, Navigate } from 'react-router-dom';
import { routes } from './routes';

function renderAt(path: string) {
  const r = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={r} />);
}

/** Recursively search the routes tree for a child at the given path. */
function findRoute(
  tree: typeof routes,
  path: string,
): { path?: string; element?: React.ReactElement } | undefined {
  for (const route of tree) {
    if ('path' in route && route.path === path) return route as { path?: string; element?: React.ReactElement };
    if ('children' in route && route.children) {
      const found = findRoute(route.children as typeof routes, path);
      if (found) return found;
    }
  }
  return undefined;
}

describe('routes', () => {
  it('renders the Law page at /law', () => {
    renderAt('/law');
    expect(screen.getByTestId('law-progress-percent')).toBeInTheDocument();
  });

  it('keeps Penal recall standalone at /penal/recall', () => {
    renderAt('/penal/recall');
    expect(screen.getByTestId('penal-recall-input')).toBeInTheDocument();
  });

  // Redirect routes: verify the route tree wires Navigate to the correct target.
  // Full render of redirects is not possible in jsdom (createMemoryRouter data router
  // uses undici Request which is incompatible with jsdom's AbortSignal).
  it('redirects /sasp to /law', () => {
    const route = findRoute(routes, 'sasp');
    expect(route).toBeDefined();
    const el = route!.element as React.ReactElement;
    expect(el.type).toBe(Navigate);
    expect(el.props.to).toBe('/law');
    expect(el.props.replace).toBe(true);
  });

  it('redirects /laws/lea to /law', () => {
    const route = findRoute(routes, 'laws/lea');
    expect(route).toBeDefined();
    const el = route!.element as React.ReactElement;
    expect(el.type).toBe(Navigate);
    expect(el.props.to).toBe('/law');
    expect(el.props.replace).toBe(true);
  });

  it('redirects /laws to /law', () => {
    const route = findRoute(routes, 'laws');
    expect(route).toBeDefined();
    const el = route!.element as React.ReactElement;
    expect(el.type).toBe(Navigate);
    expect(el.props.to).toBe('/law');
  });

  it('redirects /laws/penal to /law', () => {
    const route = findRoute(routes, 'laws/penal');
    expect(route).toBeDefined();
    const el = route!.element as React.ReactElement;
    expect(el.type).toBe(Navigate);
    expect(el.props.to).toBe('/law');
  });

  it('redirects /laws/penal/recall to /penal/recall', () => {
    const route = findRoute(routes, 'laws/penal/recall');
    expect(route).toBeDefined();
    const el = route!.element as React.ReactElement;
    expect(el.type).toBe(Navigate);
    expect(el.props.to).toBe('/penal/recall');
  });
});
