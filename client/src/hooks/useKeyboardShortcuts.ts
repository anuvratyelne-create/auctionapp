import { useEffect, useCallback } from 'react';
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

      // Arrow up for bid increment
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onIncrementBid();
        return;
      }

      // Team keyboard shortcuts for bidding
      const team = teams.find(
        (t) => t.keyboard_key?.toUpperCase() === key
      );
      if (team) {
        event.preventDefault();
        onTeamBid(team);
      }
    },
    [enabled, teams, onTeamBid, onIncrementBid]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
