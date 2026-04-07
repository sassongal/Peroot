// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ScoreDelta } from '../ScoreDelta';

afterEach(() => cleanup());

describe('ScoreDelta', () => {
  it('renders before → after with delta when before is provided', () => {
    render(<ScoreDelta before={42} after={87} />);
    expect(screen.getByTestId('score-delta')).toHaveTextContent('42');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('87');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('+45');
  });

  it('renders only the after score when before is null', () => {
    render(<ScoreDelta before={null} after={75} />);
    expect(screen.getByTestId('score-delta')).toHaveTextContent('75');
    expect(screen.getByTestId('score-delta')).not.toHaveTextContent('+');
  });

  it('uses red styling when delta is negative', () => {
    render(<ScoreDelta before={80} after={60} />);
    const el = screen.getByTestId('score-delta');
    expect(el.className).toMatch(/red|rose/);
  });
});
