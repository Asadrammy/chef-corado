'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { Loader2 } from 'lucide-react';

interface SearchFilters {
  query: string;
  type: 'chefs' | 'requests' | 'all';
  location?: string;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

interface SearchResultData {
  chefs: any[];
  requests: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
  });

  const handleSearch = async (filters: SearchFilters) => {
    setLoading(true);
    setCurrentFilters(filters);

    try {
      const params = new URLSearchParams();
      params.set('query', filters.query);
      params.set('type', filters.type);
      
      if (filters.location) params.set('location', filters.location);
      if (filters.radius) params.set('radius', filters.radius.toString());
      if (filters.minPrice) params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      // You might want to show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (results && currentFilters.query) {
      const nextPage = results.pagination.page + 1;
      handleSearch({
        ...currentFilters,
        page: nextPage,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground text-lg">
          Find the perfect chef for your event or discover new opportunities
        </p>
      </div>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {loading && !results && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {results && (
        <SearchResults
          results={results}
          loading={loading}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  );
}
