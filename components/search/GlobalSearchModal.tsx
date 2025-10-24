"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Folder, Users, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchResult {
  type: 'project' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal = ({ isOpen, onClose }: GlobalSearchModalProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search projects
        const projectResponse = await apiClient.get(`/api/projects?search=${debouncedSearch}&limit=5`);
        const projects = (projectResponse as any)?.projects || [];

        const projectResults: SearchResult[] = projects.map((project: any) => ({
          type: 'project' as const,
          id: project.id,
          title: project.title,
          subtitle: project.ownerName,
          description: project.description,
          category: project.category,
          tags: project.skillsRequired || []
        }));

        setResults(projectResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(searchQuery);
    if (result.type === 'project') {
      router.push(`/dashboard/projects/${result.id}`);
    }
    onClose();
    setSearchQuery('');
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            <motion.div
              className="w-full max-w-2xl bg-dark-card rounded-2xl shadow-2xl border border-dark-border overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center px-6 py-4 border-b border-dark-border">
                <Search className="w-5 h-5 text-text-tertiary mr-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects, users, or teams..."
                  className="flex-1 bg-transparent text-text-primary placeholder-text-tertiary outline-none text-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-3 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <kbd className="ml-3 px-2 py-1 text-xs text-text-tertiary bg-dark-surface rounded border border-dark-border">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loading && searchQuery && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <Search className="w-12 h-12 text-text-muted mb-4" />
                    <p className="text-text-secondary text-center">No results found for "{searchQuery}"</p>
                    <p className="text-text-tertiary text-sm text-center mt-2">
                      Try different keywords or check your spelling
                    </p>
                  </div>
                )}

                {!loading && !searchQuery && recentSearches.length > 0 && (
                  <div className="py-3">
                    <div className="flex items-center justify-between px-6 py-2">
                      <p className="text-sm text-text-tertiary font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Recent Searches
                      </p>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((query, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearch(query)}
                        className="w-full px-6 py-3 text-left hover:bg-white/5 transition-colors flex items-center text-text-secondary"
                      >
                        <Clock className="w-4 h-4 mr-3 text-text-muted" />
                        {query}
                      </button>
                    ))}
                  </div>
                )}

                {!loading && !searchQuery && recentSearches.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <TrendingUp className="w-12 h-12 text-text-muted mb-4" />
                    <p className="text-text-secondary text-center">Start searching to discover projects</p>
                    <p className="text-text-tertiary text-sm text-center mt-2">
                      Try searching for project names, categories, or skills
                    </p>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <motion.button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={`w-full px-6 py-4 text-left transition-all ${
                          selectedIndex === index
                            ? 'bg-brand-primary/10 border-l-2 border-l-brand-primary'
                            : 'hover:bg-white/5'
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-lg ${
                              result.type === 'project' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                            }`}>
                              {result.type === 'project' ? (
                                <Folder className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Users className="w-4 h-4 text-purple-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-text-primary font-medium mb-1">{result.title}</h3>
                              {result.subtitle && (
                                <p className="text-text-tertiary text-sm">{result.subtitle}</p>
                              )}
                              {result.description && (
                                <p className="text-text-secondary text-sm mt-1 line-clamp-1">
                                  {result.description}
                                </p>
                              )}
                              {result.category && (
                                <span className="inline-block px-2 py-1 mt-2 text-xs rounded-full bg-brand-primary/10 text-brand-primary">
                                  {result.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-text-muted" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-dark-border bg-dark-surface/50">
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <kbd className="px-1.5 py-0.5 mr-1 bg-dark-card rounded border border-dark-border">↑</kbd>
                      <kbd className="px-1.5 py-0.5 mr-1 bg-dark-card rounded border border-dark-border">↓</kbd>
                      to navigate
                    </span>
                    <span className="flex items-center">
                      <kbd className="px-1.5 py-0.5 mr-1 bg-dark-card rounded border border-dark-border">Enter</kbd>
                      to select
                    </span>
                  </div>
                  <span>{results.length} {results.length === 1 ? 'result' : 'results'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
