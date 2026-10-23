import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAppRouter } from '../router';
import { resetStore } from '../state/store';

// jsdom's window is 1024 x 768; the map starts below the 40 px action bar.
function renderAt(url: string) {
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createAppRouter(history);
  render(<RouterProvider router={router} />);
  return { history, router };
}

function panel(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

function dragHandle(name: string, from: { x: number; y: number }, to: { x: number; y: number }) {
  const handle = within(panel(name)).getByTestId('handle');
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(handle, { pointerId: 1, button: 0, clientX: to.x, clientY: to.y });
}

function layoutParam(router: ReturnType<typeof createAppRouter>): string | null {
  return new URLSearchParams(router.state.location.searchStr).get('layout');
}

describe('layout in the URL', () => {
  beforeEach(() => {
    resetStore();
  });

  it('rebuilds a layout from the link on load', async () => {
    renderAt(
      '/?layout=v1_counter~d~right~1~n_decrement~f~500~200~250~150~500~200~250~150_increment~d~right~0~n',
    );

    const decrement = await screen.findByRole('region', { name: 'Decrement' });
    expect(decrement).toHaveAttribute('data-placement', 'floating');
    expect(decrement.style.left).toBe('500px');
    expect(decrement.style.width).toBe('250px');
    expect(panel('Counter')).toHaveAttribute('data-placement', 'docked');
    expect(panel('Counter').style.left).toBe(`${1024 - 350}px`);
    expect(Number(panel('Increment').style.zIndex)).toBeGreaterThan(
      Number(panel('Counter').style.zIndex),
    );
  });

  it('falls back to the default layout for a malformed link', async () => {
    renderAt('/?layout=v9_garbage');

    const counter = await screen.findByRole('region', { name: 'Counter' });
    expect(counter).toHaveAttribute('data-placement', 'floating');
    expect(counter.style.left).toBe('400px');
  });

  it('writes the layout once a drop ends, replacing the history entry', async () => {
    const { history, router } = renderAt('/');
    const counter = await screen.findByRole('region', { name: 'Counter' });
    const grab = { x: parseFloat(counter.style.left) + 10, y: parseFloat(counter.style.top) + 10 };
    const entriesBefore = history.length;
    const handle = within(counter).getByTestId('handle');

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: grab.x, clientY: grab.y });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 600, clientY: 400 });
    expect(layoutParam(router)).toBeNull();
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 300 });
    fireEvent.pointerUp(handle, { pointerId: 1, button: 0, clientX: 10, clientY: 300 });

    await expect.poll(() => layoutParam(router)).toMatch(/^v1_.*counter~d~left~0~/);
    expect(history.length).toBe(entriesBefore);
  });

  it('writes the layout once a resize ends', async () => {
    const { router } = renderAt('/');
    const counter = await screen.findByRole('region', { name: 'Counter' });
    const corner = within(counter).getByTestId('resize-se');

    fireEvent.pointerDown(corner, { pointerId: 1, button: 0, clientX: 720, clientY: 320 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 760, clientY: 350 });
    expect(layoutParam(router)).toBeNull();
    fireEvent.pointerUp(corner, { pointerId: 1, button: 0, clientX: 760, clientY: 350 });

    await expect.poll(() => layoutParam(router)).toContain('counter~f~400~80~360~270~');
  });

  it('keeps the counter out of the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/');
    const increment = await screen.findByRole('region', { name: 'Increment' });
    await user.click(within(increment).getByRole('button', { name: 'Increment' }));
    const grab = {
      x: parseFloat(increment.style.left) + 10,
      y: parseFloat(increment.style.top) + 10,
    };

    dragHandle('Increment', grab, { x: grab.x + 20, y: grab.y + 20 });

    await expect.poll(() => layoutParam(router)).not.toBeNull();
    expect([...new URLSearchParams(router.state.location.searchStr).keys()]).toEqual(['layout']);
  });
});
