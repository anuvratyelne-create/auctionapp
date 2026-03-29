import { useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';
import { Team } from '../types';

interface UseKeyboardShortcutsProps {
  teams: Team[];
  onTeamBid: (team: Team) => void;
  onIncrementBid: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  teams,
  onTeamBid,
  onIncrementBid,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  const { setActivePanel, toggleFullscreen } = useUIStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = event.key.toUpperCase();

      // Panel navigation
      switch (key) {
        case 'A':
          event.preventDefault();
          setActivePanel('auction');
          return;
        case 'S':
          event.preventDefault();
          setActivePanel('summary');
          return;
        case 'P':
          event.preventDefault();
          setActivePanel('players');
          return;
        case 'C':
          event.preventDefault();
          setActivePanel('category');
          return;
        case 'M':
          event.preventDefault();
          setActivePanel('manage');
          return;
        case 'R':
          event.preventDefault();
          setActivePanel('retention');
          return;
        case 'T':
          event.preventDefault();
          setActivePanel('stats');
          return;
        case 'F':
          event.preventDefault();
          toggleFullscreen();
          return;
      }

      // Arrow up for bid increment
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onIncrementBid();
        return;
      }

      // Team keyboard shortcuts
      const team = teams.find(
        (t) => t.keyboard_key?.toUpperCase() === key
      );
      if (team) {
        event.preventDefault();
        onTeamBid(team);
      }
    },
    [enabled, teams, onTeamBid, onIncrementBid, setActivePanel, toggleFullscreen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
