import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../state/store';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows the counter, increment and decrement panels, each with a handle', () => {
    render(<App />);

    for (const name of ['Counter', 'Increment', 'Decrement']) {
      const panel = screen.getByRole('region', { name });
      expect(within(panel).getByTestId('handle')).toHaveTextContent(name);
    }
  });

  it('opens an empty dropdown from each action bar menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    const actionBar = screen.getByRole('menubar', { name: 'Action bar' });

    for (const name of ['File', 'View', 'Settings']) {
      const trigger = within(actionBar).getByRole('menuitem', { name });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const dropdown = screen.getByRole('menu', { name });
      expect(within(dropdown).queryAllByRole('menuitem')).toHaveLength(0);
    }
  });

  it('closes an open dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('menuitem', { name: 'File' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shares one counter across the display, increment and decrement panels', async () => {
    const user = userEvent.setup();
    render(<App />);
    const display = screen.getByRole('region', { name: 'Counter' });
    const increment = screen.getByRole('region', { name: 'Increment' });
    const decrement = screen.getByRole('region', { name: 'Decrement' });

    expect(within(display).getByRole('status')).toHaveTextContent('0');

    await user.click(within(increment).getByRole('button', { name: 'Increment' }));
    await user.click(within(increment).getByRole('button', { name: 'Increment' }));
    await user.click(within(decrement).getByRole('button', { name: 'Decrement' }));

    expect(within(display).getByRole('status')).toHaveTextContent('1');
  });
});
