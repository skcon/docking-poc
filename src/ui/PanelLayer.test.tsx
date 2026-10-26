import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../state/store';
import { App } from './App';

function panel(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

function dragHandle(name: string, from: { x: number; y: number }, to: { x: number; y: number }) {
  const handle = within(panel(name)).getByTestId('handle');
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(handle, { pointerId: 1, button: 0, clientX: to.x, clientY: to.y });
}

describe('floating panels', () => {
  beforeEach(() => {
    resetStore();
  });

  it('moves a panel with the pointer when its handle is dragged', () => {
    render(<App />);
    const counter = panel('Counter');
    const startLeft = parseFloat(counter.style.left);
    const startTop = parseFloat(counter.style.top);

    dragHandle(
      'Counter',
      { x: startLeft + 10, y: startTop + 10 },
      { x: startLeft + 110, y: startTop + 60 },
    );

    expect(counter.style.left).toBe(`${startLeft + 100}px`);
    expect(counter.style.top).toBe(`${startTop + 50}px`);
  });

  it('brings a panel in front of the others when it is clicked', () => {
    render(<App />);
    const zIndexOf = (name: string) => Number(panel(name).style.zIndex);
    expect(zIndexOf('Counter')).toBeLessThan(zIndexOf('Decrement'));

    fireEvent.pointerDown(within(panel('Counter')).getByRole('status'), {
      pointerId: 1,
      button: 0,
    });

    expect(zIndexOf('Counter')).toBeGreaterThan(zIndexOf('Increment'));
    expect(zIndexOf('Counter')).toBeGreaterThan(zIndexOf('Decrement'));
  });
});

describe('docking panels', () => {
  beforeEach(() => {
    resetStore();
  });

  // jsdom's window is 1024 x 768; the map starts below the 40 px action bar.
  it('shows a drop highlight where the panel would dock while it is dragged near an edge', () => {
    render(<App />);
    const handle = within(panel('Counter')).getByTestId('handle');
    const { left, top } = panel('Counter').style;
    const grab = { x: parseFloat(left) + 10, y: parseFloat(top) + 10 };
    expect(screen.queryByTestId('drop-highlight')).not.toBeInTheDocument();

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: grab.x, clientY: grab.y });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 300 });

    const highlight = screen.getByTestId('drop-highlight');
    expect(highlight).toHaveAttribute('data-side', 'left');
    expect(highlight).toHaveAttribute('data-kind', 'new-column');
    expect(highlight.style.left).toBe('0px');
    expect(highlight.style.width).toBe('350px');
    expect(highlight.style.height).toBe(`${768 - 40}px`);

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500, clientY: 300 });
    expect(screen.queryByTestId('drop-highlight')).not.toBeInTheDocument();
  });

  it('docks a panel released near an edge into the full-height column', () => {
    render(<App />);
    const counter = panel('Counter');
    const grab = { x: parseFloat(counter.style.left) + 10, y: parseFloat(counter.style.top) + 10 };

    dragHandle('Counter', grab, { x: 1014, y: 300 });

    expect(screen.queryByTestId('drop-highlight')).not.toBeInTheDocument();
    expect(counter.style.left).toBe(`${1024 - 350}px`);
    expect(counter.style.top).toBe('40px');
    expect(counter.style.width).toBe('350px');
    expect(counter.style.height).toBe(`${768 - 40}px`);
  });

  it('stacks a panel onto a column with one panel, 50/50', () => {
    render(<App />);
    const counter = panel('Counter');
    const increment = panel('Increment');
    const grabOf = (el: HTMLElement) => ({
      x: parseFloat(el.style.left) + 10,
      y: parseFloat(el.style.top) + 10,
    });
    dragHandle('Counter', grabOf(counter), { x: 10, y: 100 });

    const handle = within(increment).getByTestId('handle');
    const grab = grabOf(increment);
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: grab.x, clientY: grab.y });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100, clientY: 600 });
    const preview = screen.getByTestId('drop-highlight');
    expect(preview).toHaveAttribute('data-kind', 'stack');
    expect(preview.style.top).toBe(`${40 + (768 - 40) / 2}px`);
    expect(preview.style.height).toBe(`${(768 - 40) / 2}px`);
    fireEvent.pointerUp(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 600 });

    expect(counter.style.height).toBe(`${(768 - 40) / 2}px`);
    expect(increment.style.top).toBe(`${40 + (768 - 40) / 2}px`);
    expect(increment.style.left).toBe('0px');
  });

  it('offers no resize edges on a docked panel', () => {
    render(<App />);
    const counter = panel('Counter');
    const grab = { x: parseFloat(counter.style.left) + 10, y: parseFloat(counter.style.top) + 10 };

    dragHandle('Counter', grab, { x: 10, y: 300 });

    expect(within(counter).queryByTestId('resize-se')).not.toBeInTheDocument();
  });

  it('keeps a docked panel in its column when the browser window is resized', () => {
    const initialWidth = window.innerWidth;
    render(<App />);
    const counter = panel('Counter');
    const grab = { x: parseFloat(counter.style.left) + 10, y: parseFloat(counter.style.top) + 10 };
    dragHandle('Counter', grab, { x: 1014, y: 300 });

    act(() => {
      window.innerWidth = 900;
      window.dispatchEvent(new Event('resize'));
    });

    expect(counter.style.left).toBe(`${900 - 350}px`);
    window.innerWidth = initialWidth;
  });
});

describe('undocking panels', () => {
  beforeEach(() => {
    resetStore();
  });

  it('undocks a docked panel when its handle is dragged, floating it under the pointer', () => {
    render(<App />);
    const counter = panel('Counter');
    const grab = { x: parseFloat(counter.style.left) + 10, y: parseFloat(counter.style.top) + 10 };
    dragHandle('Counter', grab, { x: 1014, y: 300 });
    expect(counter).toHaveAttribute('data-placement', 'docked');

    // Grab the 350 px docked handle 35 px in (a tenth), then drag it into the middle.
    dragHandle('Counter', { x: 1024 - 350 + 35, y: 50 }, { x: 500, y: 300 });

    expect(counter).toHaveAttribute('data-placement', 'floating');
    expect(counter.style.width).toBe('320px');
    // A tenth along the 320 px floating handle.
    expect(counter.style.left).toBe(`${500 - 32}px`);
    expect(counter.style.top).toBe('290px');
  });

  it('lets the neighbour fill the column as soon as the dragged panel floats', () => {
    render(<App />);
    const counter = panel('Counter');
    const increment = panel('Increment');
    const grabOf = (el: HTMLElement) => ({
      x: parseFloat(el.style.left) + 10,
      y: parseFloat(el.style.top) + 10,
    });
    dragHandle('Counter', grabOf(counter), { x: 10, y: 100 });
    dragHandle('Increment', grabOf(increment), { x: 10, y: 700 });
    const half = `${(768 - 40) / 2}px`;
    expect(increment.style.height).toBe(half);
    expect(counter.style.height).toBe(half);

    const handle = within(counter).getByTestId('handle');
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 600, clientY: 300 });

    expect(increment.style.height).toBe(`${768 - 40}px`);
    expect(increment.style.top).toBe('40px');
  });

  it('closes the gap when the only panel of a column leaves', () => {
    render(<App />);
    const counter = panel('Counter');
    const increment = panel('Increment');
    const grabOf = (el: HTMLElement) => ({
      x: parseFloat(el.style.left) + 10,
      y: parseFloat(el.style.top) + 10,
    });
    dragHandle('Counter', grabOf(counter), { x: 10, y: 100 });
    // Just inside the inner edge of the left column: a new column at x = 350.
    dragHandle('Increment', grabOf(increment), { x: 400, y: 100 });
    expect(increment.style.left).toBe('350px');

    dragHandle('Counter', { x: 100, y: 50 }, { x: 600, y: 400 });

    expect(increment.style.left).toBe('0px');
  });
});

describe('resizing floating panels', () => {
  const initialWidth = window.innerWidth;

  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    window.innerWidth = initialWidth;
  });

  it('resizes a panel when its bottom-right corner is dragged', () => {
    render(<App />);
    const counter = panel('Counter');
    const width = parseFloat(counter.style.width);
    const height = parseFloat(counter.style.height);
    const corner = within(counter).getByTestId('resize-se');

    fireEvent.pointerDown(corner, { pointerId: 1, button: 0, clientX: 500, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 540, clientY: 330 });
    fireEvent.pointerUp(corner, { pointerId: 1, button: 0, clientX: 540, clientY: 330 });

    expect(counter.style.width).toBe(`${width + 40}px`);
    expect(counter.style.height).toBe(`${height + 30}px`);
  });

  it('offers every edge and corner for resizing', () => {
    render(<App />);
    const counter = panel('Counter');

    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(within(counter).getByTestId(`resize-${edge}`)).toBeInTheDocument();
    }
  });

  it('pulls a panel back into view when the browser window shrinks', () => {
    render(<App />);
    const counter = panel('Counter');
    const width = parseFloat(counter.style.width);

    act(() => {
      window.innerWidth = 600;
      window.dispatchEvent(new Event('resize'));
    });

    expect(counter.style.left).toBe(`${600 - width}px`);
  });
});

describe('interrupted gestures', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ends a drag when the handle loses pointer capture, restoring the panel', () => {
    render(<App />);
    const counter = panel('Counter');
    const { left, top } = counter.style;
    const handle = within(counter).getByTestId('handle');
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      clientX: parseFloat(left) + 10,
      clientY: parseFloat(top) + 10,
    });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 300 });
    expect(screen.getByTestId('drop-highlight')).toBeInTheDocument();

    fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 600, clientY: 400 });

    expect(screen.queryByTestId('drop-highlight')).not.toBeInTheDocument();
    expect(counter.style.left).toBe(left);
    expect(counter.style.top).toBe(top);
  });

  it('restores the size when the browser cancels a resize', () => {
    render(<App />);
    const counter = panel('Counter');
    const { width, height } = counter.style;
    const corner = within(counter).getByTestId('resize-se');

    fireEvent.pointerDown(corner, { pointerId: 1, button: 0, clientX: 500, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 560, clientY: 340 });
    fireEvent.pointerCancel(corner, { pointerId: 1, clientX: 560, clientY: 340 });

    expect(counter.style.width).toBe(width);
    expect(counter.style.height).toBe(height);
  });
});
