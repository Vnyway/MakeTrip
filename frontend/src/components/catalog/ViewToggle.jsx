import { Grid3X3, Rows3 } from 'lucide-react';

export function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-mint-200 bg-white">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm ${
          view === 'grid' ? 'bg-brand text-white' : 'text-brand hover:bg-mint-200'
        }`}
      >
        <Grid3X3 size={14} /> Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`inline-flex items-center gap-1 border-l border-mint-200 px-3 py-2 text-sm ${
          view === 'list' ? 'bg-brand text-white' : 'text-brand hover:bg-mint-200'
        }`}
      >
        <Rows3 size={14} /> List
      </button>
    </div>
  );
}
