import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { soundManager } from '../utils/soundManager';

type Panel = 'auction' | 'summary' | 'players' | 'category' | 'manage' | 'retention' | 'stats' | 'draft' | 'analytics';

interface UIState {
  activePanel: Panel;
  isFullscreen: boolean;
  showTeamSquad: string | null;
  playerFilter: 'all' | 'available' | 'sold' | 'unsold';
  showExtraMenu: boolean;
  showChat: boolean;
  showImportModal: boolean;
  selectedTemplateId: string;
  showTemplateSelector: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  timerDuration: number;
  acceleratedMode: boolean;
  acceleratedTimerDuration: number;
  setActivePanel: (panel: Panel) => void;
  toggleFullscreen: () => void;
  setShowTeamSquad: (teamId: string | null) => void;
  setPlayerFilter: (filter: 'all' | 'available' | 'sold' | 'unsold') => void;
  toggleExtraMenu: () => void;
  toggleChat: () => void;
  setShowImportModal: (show: boolean) => void;
  setSelectedTemplate: (templateId: string) => void;
  toggleTemplateSelector: () => void;
  toggleSound: () => void;
  setSoundVolume: (volume: number) => void;
  setTimerDuration: (duration: number) => void;
  toggleAcceleratedMode: () => void;
  setAcceleratedTimerDuration: (duration: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      activePanel: 'auction',
      isFullscreen: false,
      showTeamSquad: null,
      playerFilter: 'all',
      showExtraMenu: false,
      showChat: false,
      showImportModal: false,
      selectedTemplateId: 'tech-blue',
      showTemplateSelector: false,
      soundEnabled: true,
      soundVolume: 0.7,
      timerDuration: 30,
      acceleratedMode: false,
      acceleratedTimerDuration: 10,

      setActivePanel: (panel) => {
        set({ activePanel: panel, showExtraMenu: false });
      },

      toggleFullscreen: () => {
        const isFullscreen = !get().isFullscreen;
        try {
          if (isFullscreen) {
            document.documentElement.requestFullscreen?.();
          } else {
            // Only exit fullscreen if actually in fullscreen mode
            if (document.fullscreenElement) {
              document.exitFullscreen?.();
            }
          }
        } catch (error) {
          console.warn('Fullscreen toggle failed:', error);
        }
        set({ isFullscreen });
      },

      setShowTeamSquad: (teamId) => {
        set({ showTeamSquad: teamId });
      },

      setPlayerFilter: (filter) => {
        set({ playerFilter: filter });
      },

      toggleExtraMenu: () => {
        set((state) => ({ showExtraMenu: !state.showExtraMenu }));
      },

      toggleChat: () => {
        set((state) => ({ showChat: !state.showChat }));
      },

      setShowImportModal: (show) => {
        set({ showImportModal: show });
      },

      setSelectedTemplate: (templateId) => {
        set({ selectedTemplateId: templateId, showTemplateSelector: false });
      },

      toggleTemplateSelector: () => {
        set((state) => ({ showTemplateSelector: !state.showTemplateSelector }));
      },

      toggleSound: () => {
        const newEnabled = !get().soundEnabled;
        soundManager.setEnabled(newEnabled);
        set({ soundEnabled: newEnabled });
      },

      setSoundVolume: (volume) => {
        soundManager.setVolume(volume);
        set({ soundVolume: volume });
      },

      setTimerDuration: (duration) => {
        set({ timerDuration: duration });
      },

      toggleAcceleratedMode: () => {
        set((state) => ({ acceleratedMode: !state.acceleratedMode }));
      },

      setAcceleratedTimerDuration: (duration) => {
        set({ acceleratedTimerDuration: duration });
      },
    }),
    {
      name: 'auction-ui-storage',
      partialize: (state) => ({
        selectedTemplateId: state.selectedTemplateId,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        timerDuration: state.timerDuration,
        acceleratedMode: state.acceleratedMode,
        acceleratedTimerDuration: state.acceleratedTimerDuration,
      }),
    }
  )
);
