import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="input flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? 'text-ink' : 'text-ink-faint'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-sm border border-line bg-white shadow-pop">
          <input
            autoFocus
            className="w-full border-b border-line px-3 py-2 text-sm outline-none"
            placeholder="Type to search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-ink-faint">No matches.</p>}
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-black/5"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span>{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-ink-faint">{opt.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
