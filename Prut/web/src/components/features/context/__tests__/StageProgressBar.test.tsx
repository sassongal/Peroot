// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// framer-motion uses useContext internally; mock it to avoid hook errors in jsdom
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, tag: string | symbol) => {
      if (typeof tag !== 'string') {
        return () => null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ({ children, ...props }: any) => createElement(tag, props, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { StageProgressBar } from '../StageProgressBar';

describe('StageProgressBar', () => {
  it('renders 4 stage pills', () => {
    render(<StageProgressBar stage="extracting" />);
    const pills = screen.getAllByTestId(/^stage-pill-/);
    expect(pills).toHaveLength(4);
  });
  it('marks extracting as active and uploading as complete', () => {
    render(<StageProgressBar stage="extracting" />);
    expect(screen.getByTestId('stage-pill-uploading')).toHaveAttribute('data-state', 'complete');
    expect(screen.getByTestId('stage-pill-extracting')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTestId('stage-pill-enriching')).toHaveAttribute('data-state', 'pending');
  });
  it('shows error state when stage=error', () => {
    render(<StageProgressBar stage="error" />);
    expect(screen.getByTestId('stage-error')).toBeInTheDocument();
  });
});
