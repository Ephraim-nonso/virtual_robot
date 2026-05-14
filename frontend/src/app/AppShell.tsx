import type { PropsWithChildren, ReactNode } from 'react';

import './app-shell.css';

type AppShellProps = PropsWithChildren<{
  heroVisual: ReactNode;
  metrics: ReactNode;
  banner?: ReactNode;
}>;

export const AppShell = ({ heroVisual, metrics, banner, children }: AppShellProps) => (
  <main className="app-shell">
    <section className="hero-panel">
      <div>
        <p className="eyebrow">Virtual Robot Management</p>
        {heroVisual}
      </div>
      <div className="hero-metrics">{metrics}</div>
    </section>

    {banner}

    {children}
  </main>
);
