import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface MultiSelectProps {
    options: { id: string | number; name: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    label?: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder = "Select...", label }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(item => item !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition"
            >
                <div className="flex flex-wrap gap-1 overflow-hidden">
                    {selected.length === 0 ? (
                        <span className="text-gray-500 text-sm">{placeholder}</span>
                    ) : (
                        <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">
                            {selected.length} selected
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {selected.length > 0 && (
                        <div onClick={handleClear} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                            <X size={14} />
                        </div>
                    )}
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">No results found</div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = selected.includes(String(option.id));
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => toggleSelection(String(option.id))}
                                        className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <span>{option.name}</span>
                                        {isSelected && <Check size={14} />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
