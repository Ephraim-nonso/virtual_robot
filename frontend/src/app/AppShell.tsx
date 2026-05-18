import type { PropsWithChildren } from 'react';

import './app-shell.css';

export const AppShell = ({ children }: PropsWithChildren) => <main className="app-shell">{children}</main>;
