import { useEffect, useRef, useState } from 'react';
import { ACTION_BAR_HEIGHT_PX } from '../domain';

const MENUS = ['File', 'View', 'Settings'] as const;
type MenuName = (typeof MENUS)[number];

/** The bar across the top holding placeholder menus. It is not a zone. */
export function ActionBar() {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openMenu === null) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu]);

  return (
    <div
      ref={barRef}
      role="menubar"
      aria-label="Action bar"
      className="relative z-[1000] flex shrink-0 items-center gap-1 border-b border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"
      style={{ height: ACTION_BAR_HEIGHT_PX }}
    >
      {MENUS.map((name) => (
        <Menu
          key={name}
          name={name}
          open={openMenu === name}
          onToggle={() => setOpenMenu((current) => (current === name ? null : name))}
        />
      ))}
    </div>
  );
}

type MenuProps = { name: MenuName; open: boolean; onToggle: () => void };

function Menu({ name, open, onToggle }: MenuProps) {
  const menuId = `menu-${name.toLowerCase()}`;
  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={onToggle}
        className="rounded px-3 py-1 hover:bg-slate-700 aria-expanded:bg-slate-700"
      >
        {name}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={name}
          className="absolute top-full left-0 mt-1 min-h-16 w-48 rounded-md border border-slate-300 bg-white py-1 text-slate-500 shadow-lg"
        />
      )}
    </div>
  );
}
