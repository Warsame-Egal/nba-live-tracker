import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { PlayerSummary } from "../types/player";
import debounce from "lodash/debounce";

interface SearchBarProps {
  onResults: (results: PlayerSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onResults,
  setLoading,
  setError,
  placeholder = "Search players...",
}) => {
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  useEffect(() => {
    const abortController = new AbortController();

    const debouncedFetch = debounce(async (search: string) => {
      if (!search) {
        onResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/players/search/${search}`,
          { signal: abortController.signal }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data.");
        }
        const data: PlayerSummary[] = await response.json();
        onResults(data);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") return;
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
        onResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    debouncedFetch(searchQuery);

    return () => {
      abortController.abort();
      debouncedFetch.cancel();
    };
  }, [searchQuery, onResults, setLoading, setError]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSearchParams({ search: value });
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pl-10 pr-12 bg-neutral-900 border border-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FaSearch className="text-gray-400" />
      </div>
      {query && (
        <button
          onClick={() => handleSearch("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
