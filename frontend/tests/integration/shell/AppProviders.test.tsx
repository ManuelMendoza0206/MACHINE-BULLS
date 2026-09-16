import { render, screen } from '@testing-library/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useRef } from 'react';
import { describe, it, expect } from 'vitest';
import { AppProviders } from '@/app/providers';
import { defaultQueryClientConfig } from '@/lib/api/queryClient';

// app-shell/spec.md — Requirement "Providers globales instanciados una sola vez".

function Probe({ onRender }: { onRender: (client: QueryClient) => void }): JSX.Element {
  const client = useQueryClient();
  const { theme } = useTheme();
  const renders = useRef(0);
  renders.current += 1;
  onRender(client);
  return (
    <div data-testid="probe" data-renders={renders.current} data-theme={theme ?? 'unset'}>
      ok
    </div>
  );
}

describe('AppProviders', () => {
  it('creates the QueryClient once and keeps the same reference across re-renders', () => {
    const seen: QueryClient[] = [];
    const { rerender } = render(
      <AppProviders>
        <Probe onRender={c => seen.push(c)} />
      </AppProviders>
    );
    rerender(
      <AppProviders>
        <Probe onRender={c => seen.push(c)} />
      </AppProviders>
    );

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(1); // one instance, every render
  });

  it('applies the shared default config to the client', () => {
    let client: QueryClient | undefined;
    render(
      <AppProviders>
        <Probe onRender={c => (client = c)} />
      </AppProviders>
    );
    const opts = client!.getDefaultOptions();
    expect(opts.queries?.retry).toBe(defaultQueryClientConfig.defaultOptions?.queries?.retry);
    expect(opts.queries?.staleTime).toBe(30_000);
    expect(opts.mutations?.retry).toBe(false);
  });

  it('exposes theme and query context to children without crashing', () => {
    render(
      <AppProviders>
        <Probe onRender={() => {}} />
      </AppProviders>
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('ok');
  });
});
