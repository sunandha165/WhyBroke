import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Hero from './Hero';

describe('Hero', () => {
  it('renders the title and tagline', () => {
    render(<Hero onInvestigate={() => {}} isRunning={false} />);
    expect(screen.getByText('WHYBROKE')).toBeInTheDocument();
    expect(screen.getByText(/tells you/i)).toBeInTheDocument();
  });

  it('calls onInvestigate with no params when the demo button is clicked', () => {
    const onInvestigate = vi.fn();
    render(<Hero onInvestigate={onInvestigate} isRunning={false} />);
    fireEvent.click(screen.getByRole('button', { name: /investigate demo regression/i }));
    expect(onInvestigate).toHaveBeenCalledTimes(1);
    // Called with no arguments — params are intentionally omitted for the demo path
    expect(onInvestigate).toHaveBeenCalledWith();
  });

  it('disables the buttons while investigating', () => {
    render(<Hero onInvestigate={() => {}} isRunning={true} />);
    // When running, the demo button text changes to "Investigating…"
    const demoBtn = screen.getByRole('button', { name: /investigating/i });
    expect(demoBtn).toBeDisabled();
    const toggleBtn = screen.getByRole('button', { name: /investigate a real repository/i });
    expect(toggleBtn).toBeDisabled();
  });

  it('reveals the custom-repo form when the toggle button is clicked', () => {
    render(<Hero onInvestigate={() => {}} isRunning={false} />);
    expect(screen.queryByLabelText(/custom repository form/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /investigate a real repository/i }));
    expect(screen.getByLabelText(/custom repository form/i)).toBeInTheDocument();
  });

  it('calls onInvestigate with parsed params when the custom form is submitted', () => {
    const onInvestigate = vi.fn();
    render(<Hero onInvestigate={onInvestigate} isRunning={false} />);

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /investigate a real repository/i }));

    fireEvent.change(screen.getByPlaceholderText(/C:\\Users/i), {
      target: { value: 'C:\\projects\\my-app' },
    });
    fireEvent.change(screen.getByPlaceholderText(/test\/my\.test\.js/i), {
      target: { value: 'test/app.test.js' },
    });
    fireEvent.change(screen.getByPlaceholderText(/src\/checkout\.js/i), {
      target: { value: 'src/foo.js, src/bar.js' },
    });

    fireEvent.click(screen.getByRole('button', { name: /investigate this repository/i }));

    expect(onInvestigate).toHaveBeenCalledTimes(1);
    expect(onInvestigate).toHaveBeenCalledWith({
      repoPath: 'C:\\projects\\my-app',
      testFile: 'test/app.test.js',
      sourceFiles: ['src/foo.js', 'src/bar.js'],
    });
  });
});
