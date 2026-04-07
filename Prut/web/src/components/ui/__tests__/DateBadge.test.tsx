// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DateBadge } from '../DateBadge';
import type { PromptEntity } from '@/lib/prompt-entity';

const baseEntity: PromptEntity = {
  id: 'a',
  title: 't',
  original: '',
  enhanced: 'e',
  table: 'history',
  createdAt: '2026-04-07T10:00:00.000Z',
  updatedAt: '2026-04-07T10:00:00.000Z',
  lastUsedAt: null,
  source: 'web',
  mode: 'STANDARD',
  category: '',
  tone: null,
  variables: [],
  visibility: 'private',
};

describe('DateBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the created relative time in default mode', () => {
    render(<DateBadge entity={baseEntity} />);
    expect(screen.getByText(/לפני/)).toBeInTheDocument();
  });

  it('inline mode renders three chips when timestamps differ', () => {
    render(
      <DateBadge
        mode="inline"
        entity={{
          ...baseEntity,
          updatedAt: '2026-04-07T11:00:00.000Z',
          lastUsedAt: '2026-04-07T11:30:00.000Z',
        }}
      />
    );
    expect(screen.getByTestId('date-badge-created')).toBeInTheDocument();
    expect(screen.getByTestId('date-badge-updated')).toBeInTheDocument();
    expect(screen.getByTestId('date-badge-last-used')).toBeInTheDocument();
  });

  it('inline mode hides updated chip when equal to created', () => {
    render(
      <DateBadge
        mode="inline"
        entity={{ ...baseEntity, lastUsedAt: '2026-04-07T11:30:00.000Z' }}
      />
    );
    expect(screen.getByTestId('date-badge-created')).toBeInTheDocument();
    expect(screen.queryByTestId('date-badge-updated')).not.toBeInTheDocument();
    expect(screen.getByTestId('date-badge-last-used')).toBeInTheDocument();
  });

  it('compact mode renders a single chip with title attribute', () => {
    render(<DateBadge mode="compact" entity={baseEntity} />);
    const chip = screen.getByTestId('date-badge-compact');
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute('title')).toMatch(/\d/);
  });
});
