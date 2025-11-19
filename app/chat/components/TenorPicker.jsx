import React, { useState, useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Tenor API v2 key
const TENOR_CLIENT_KEY = 'goonchan';

export const TenorPicker = ({ currentTheme, onGifSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState('');
  const searchInputRef = useRef(null);
  const scrollRef = useRef(null);

  // Load featured/trending GIFs on mount
  useEffect(() => {
    loadFeaturedGifs();
    // Focus search input when picker opens
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const loadFeaturedGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
      setNext(data.next || '');
    } catch (error) {
      console.error('Failed to load featured GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query) => {
    if (!query.trim()) {
      loadFeaturedGifs();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
      setNext(data.next || '');
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!next || loading) return;

    setLoading(true);
    try {
      const endpoint = searchQuery.trim() ? 'search' : 'featured';
      const query = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery)}` : '';
      
      const response = await fetch(
        `https://tenor.googleapis.com/v2/${endpoint}?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}${query}&limit=20&pos=${next}`
      );
      const data = await response.json();
      setGifs(prev => [...prev, ...(data.results || [])]);
      setNext(data.next || '');
    } catch (error) {
      console.error('Failed to load more GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchGifs(query);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMore();
    }
  };

  const handleGifClick = (gif) => {
    const gifUrl = gif.media_formats?.gif?.url || gif.url;
    onGifSelect(gifUrl);
  };

  return (
    <div
      className="w-[343px] h-[435px] rounded-lg border shadow-lg flex flex-col"
      style={{
        backgroundColor: currentTheme.bg.secondary,
        borderColor: currentTheme.border.secondary,
      }}
    >
      {/* Search bar */}
      <div className="p-3 border-b" style={{ borderColor: currentTheme.border.primary }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md border"
          style={{
            backgroundColor: currentTheme.bg.tertiary,
            borderColor: currentTheme.border.primary,
          }}
        >
          <FiSearch className="text-sm" style={{ color: currentTheme.text.tertiary }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Tenor"
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: currentTheme.text.secondary }}
          />
        </div>
      </div>

      {/* GIF grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${currentTheme.border.secondary} transparent`,
        }}
      >
        {gifs.map((gif) => {
          const dims = gif.media_formats?.tinygif?.dims || gif.media_formats?.nanogif?.dims || [1, 1];
          const aspectRatio = dims[0] / dims[1];
          
          return (
            <div
              key={gif.id}
              className="relative cursor-pointer rounded overflow-hidden hover:opacity-80 transition-opacity"
              onClick={() => handleGifClick(gif)}
              style={{
                backgroundColor: currentTheme.bg.tertiary,
                width: '100%',
                height: 'auto',
                minHeight: '120px',
                maxHeight: '200px',
              }}
            >
              <img
                src={gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url}
                alt={gif.content_description || 'GIF'}
                className="w-full h-full object-contain"
                loading="lazy"
                style={{ maxHeight: '200px' }}
              />
            </div>
          );
        })}
        
        {loading && (
          <div className="col-span-2 flex items-center justify-center py-4">
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{
                borderColor: `${currentTheme.accent}30`,
                borderTopColor: currentTheme.accent,
              }}
            />
          </div>
        )}
      </div>

      {/* Powered by Tenor */}
      <div
        className="px-3 py-2 text-center text-[10px] border-t"
        style={{
          color: currentTheme.text.muted,
          borderColor: currentTheme.border.primary,
        }}
      >
        Powered by Tenor
      </div>
    </div>
  );
};
