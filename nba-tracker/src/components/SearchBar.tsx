import { useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

interface SearchBarProps {
  setSearchQuery: (query: string) => void;
}

const SearchBar = ({ setSearchQuery }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchQuery("");
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search teams, players..."
        className="w-full px-4 py-3 pl-10 pr-12 text-white bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Search Icon (Left) */}
      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

      {/* Clear Button (Right) */}
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
