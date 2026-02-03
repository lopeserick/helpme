import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "Buscar..." 
}) => {
  return (
    <div className="relative max-w-2xl">
      <svg 
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-14 pr-6 py-4 rounded-xl text-gray-800 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
      />
    </div>
  );
};

export default SearchInput;
