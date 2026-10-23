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
