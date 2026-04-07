// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BeforeAfterSplit } from '../BeforeAfterSplit';

afterEach(() => cleanup());

describe('BeforeAfterSplit', () => {
  it('tabs mode shows after content by default and "after" tab is the active hero', () => {
    render(<BeforeAfterSplit original="orig text" enhanced="new text" />);
    expect(screen.getByText('new text')).toBeInTheDocument();
    expect(screen.queryByText('orig text')).not.toBeInTheDocument();
    const afterBtn = screen.getByRole('button', { name: 'אחרי' });
    expect(afterBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('split mode renders "before" pane with reduced opacity (subdued)', () => {
    render(<BeforeAfterSplit mode="split" original="orig" enhanced="new" />);
    const beforeText = screen.getByText('orig');
    // Walk up to find the wrapper that has the opacity class
    const wrapper = beforeText.closest('[class*="opacity"]');
    expect(wrapper).not.toBeNull();
  });

  it('tabs mode switches to before when before tab clicked', () => {
    render(<BeforeAfterSplit original="orig text" enhanced="new text" />);
    fireEvent.click(screen.getByRole('button', { name: 'לפני' }));
    expect(screen.getByText('orig text')).toBeInTheDocument();
  });

  it('split mode shows both panes simultaneously', () => {
    render(<BeforeAfterSplit mode="split" original="orig text" enhanced="new text" />);
    expect(screen.getByText('orig text')).toBeInTheDocument();
    expect(screen.getByText('new text')).toBeInTheDocument();
  });

  it('renders ScoreDelta when score is provided', () => {
    render(
      <BeforeAfterSplit
        original="o"
        enhanced="e"
        score={{ before: 30, after: 80 }}
      />
    );
    expect(screen.getByTestId('score-delta')).toHaveTextContent('30');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('80');
  });

  it('renders improvements list when provided', () => {
    render(
      <BeforeAfterSplit
        original="o"
        enhanced="e"
        score={{ before: 30, after: 80, improvements: ['ברור יותר', 'ספציפי יותר'] }}
      />
    );
    expect(screen.getByText('ברור יותר')).toBeInTheDocument();
    expect(screen.getByText('ספציפי יותר')).toBeInTheDocument();
  });

  it('hides before tab entirely when original is empty', () => {
    render(<BeforeAfterSplit original="" enhanced="only after" />);
    expect(screen.queryByRole('button', { name: 'לפני' })).not.toBeInTheDocument();
    expect(screen.getByText('only after')).toBeInTheDocument();
  });
});
