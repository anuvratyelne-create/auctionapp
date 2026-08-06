import { useState, useRef, useEffect } from 'react';
import { useAuctionStore } from '../../stores/auctionStore';
import { ROLE_FILTER_CATEGORIES } from '../../config/playerRoles';
import { ChevronDown, Users } from 'lucide-react';

interface RoleFilterDropdownProps {
  disabled?: boolean;
  theme?: 'default' | 'fire' | 'city' | 'premium' | 'classic';
}

export default function RoleFilterDropdown({ disabled, theme = 'default' }: RoleFilterDropdownProps) {
  const { selectedRoleCategory, setSelectedRoleCategory } = useAuctionStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = ROLE_FILTER_CATEGORIES.find((c) => c.id === selectedRoleCategory);

  // Theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'fire':
        return {
          button: 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30',
          dropdown: 'bg-slate-900/95 border-orange-500/30',
          item: 'hover:bg-orange-500/20 text-slate-300',
          itemActive: 'bg-orange-500/30 text-orange-400 border-orange-500/40',
        };
      case 'city':
        return {
          button: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30',
          dropdown: 'bg-slate-900/95 border-cyan-500/30',
          item: 'hover:bg-cyan-500/20 text-slate-300',
          itemActive: 'bg-cyan-500/30 text-cyan-400 border-cyan-500/40',
        };
      case 'premium':
        return {
          button: 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30',
          dropdown: 'bg-slate-900/95 border-amber-500/30',
          item: 'hover:bg-amber-500/20 text-slate-300',
          itemActive: 'bg-amber-500/30 text-amber-400 border-amber-500/40',
        };
      default:
        return {
          button: 'bg-primary-500/20 border-primary-500/40 text-primary-400 hover:bg-primary-500/30',
          dropdown: 'bg-slate-900/95 border-slate-700',
          item: 'hover:bg-slate-800 text-slate-300',
          itemActive: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all disabled:opacity-50 ${styles.button}`}
        title="Filter by Role"
      >
        {selectedCategory ? (
          <>
            <span className="text-sm">{selectedCategory.icon}</span>
            <span className="text-sm font-medium hidden sm:inline">{selectedCategory.name}</span>
          </>
        ) : (
          <>
            <Users size={16} />
            <span className="text-sm font-medium hidden sm:inline">All Roles</span>
          </>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 min-w-[180px] rounded-xl border shadow-xl z-50 backdrop-blur-xl overflow-hidden ${styles.dropdown}`}>
          <div className="p-1">
            {/* All Roles option */}
            <button
              onClick={() => {
                setSelectedRoleCategory(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                !selectedRoleCategory ? styles.itemActive + ' border' : styles.item
              }`}
            >
              <Users size={16} />
              <span className="font-medium">All Roles</span>
            </button>

            <div className="h-px bg-slate-700/50 my-1" />

            {/* Role categories */}
            {ROLE_FILTER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedRoleCategory(category.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedRoleCategory === category.id ? styles.itemActive + ' border' : styles.item
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
