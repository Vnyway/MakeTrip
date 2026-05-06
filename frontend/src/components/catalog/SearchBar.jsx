import { Search } from 'lucide-react';

export function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-xl border border-mint-200 bg-white p-2 shadow-card">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-mint-100 px-3 py-2">
        <Search size={16} className="text-accent" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Where do you want to go?"
          className="w-full border-none bg-transparent text-sm text-brand outline-none placeholder:text-accent/70"
        />
      </div>
      <button type="submit" className="btn-primary px-4">
        Search
      </button>
    </form>
  );
}
