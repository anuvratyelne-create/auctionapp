import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { soundManager } from '../utils/soundManager';
import { LayoutType } from '../config/auctionLayouts';

type Panel = 'auction' | 'summary' | 'players' | 'category' | 'manage' | 'retention' | 'stats' | 'draft' | 'analytics';

interface UIState {
  activePanel: Panel;
  isFullscreen: boolean;
  showTeamSquad: string | null;
  playerFilter: 'all' | 'available' | 'sold' | 'unsold';
  showExtraMenu: boolean;
  showChat: boolean;
  showImportModal: boolean;
  // Separate layout and theme
  selectedLayout: LayoutType;
  selectedThemeId: string;
  showTemplateSelector: boolean;
  showLayoutSelector: boolean;
  showThemeSelector: boolean;
  // Legacy support
  selectedTemplateId: string;
  soundEnabled: boolean;
  soundVolume: number;
  timerDuration: number;
  acceleratedMode: boolean;
  acceleratedTimerDuration: number;
  showSponsors: boolean;
  sponsorRotationInterval: number;
  setActivePanel: (panel: Panel) => void;
  toggleFullscreen: () => void;
  setShowTeamSquad: (teamId: string | null) => void;
  setPlayerFilter: (filter: 'all' | 'available' | 'sold' | 'unsold') => void;
  toggleExtraMenu: () => void;
  toggleChat: () => void;
  setShowImportModal: (show: boolean) => void;
  setSelectedLayout: (layout: LayoutType) => void;
  setSelectedTheme: (themeId: string) => void;
  setSelectedTemplate: (templateId: string) => void;
  toggleTemplateSelector: () => void;
  toggleLayoutSelector: () => void;
  toggleThemeSelector: () => void;
  toggleSound: () => void;
  setSoundVolume: (volume: number) => void;
  setTimerDuration: (duration: number) => void;
  toggleAcceleratedMode: () => void;
  setAcceleratedTimerDuration: (duration: number) => void;
  toggleSponsors: () => void;
  setSponsorRotationInterval: (interval: number) => void;
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
      selectedLayout: 'classic',
      selectedThemeId: 'stadium-premium',
      selectedTemplateId: 'stadium-premium', // Legacy
      showTemplateSelector: false,
      showLayoutSelector: false,
      showThemeSelector: false,
      soundEnabled: true,
      soundVolume: 0.7,
      timerDuration: 30,
      acceleratedMode: false,
      acceleratedTimerDuration: 10,
      showSponsors: true,
      sponsorRotationInterval: 5,

      setActivePanel: (panel) => {
        set({ activePanel: panel, showExtraMenu: false });
      },

      toggleFullscreen: () => {
        const isFullscreen = !get().isFullscreen;
        try {
          if (isFullscreen) {
            document.documentElement.requestFullscreen?.();
          } else {
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

      setSelectedLayout: (layout) => {
        set({ selectedLayout: layout, showLayoutSelector: false });
      },

      setSelectedTheme: (themeId) => {
        set({ selectedThemeId: themeId, selectedTemplateId: themeId, showTemplateSelector: false });
      },

      setSelectedTemplate: (templateId) => {
        set({ selectedTemplateId: templateId, selectedThemeId: templateId, showTemplateSelector: false });
      },

      toggleTemplateSelector: () => {
        set((state) => ({ showTemplateSelector: !state.showTemplateSelector, showLayoutSelector: false }));
      },

      toggleLayoutSelector: () => {
        set((state) => ({ showLayoutSelector: !state.showLayoutSelector, showTemplateSelector: false, showThemeSelector: false }));
      },

      toggleThemeSelector: () => {
        set((state) => ({ showThemeSelector: !state.showThemeSelector, showTemplateSelector: false, showLayoutSelector: false }));
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

      toggleSponsors: () => {
        set((state) => ({ showSponsors: !state.showSponsors }));
      },

      setSponsorRotationInterval: (interval) => {
        set({ sponsorRotationInterval: interval });
      },
    }),
    {
      name: 'auction-ui-storage',
      partialize: (state) => ({
        selectedLayout: state.selectedLayout,
        selectedThemeId: state.selectedThemeId,
        selectedTemplateId: state.selectedTemplateId,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        timerDuration: state.timerDuration,
        acceleratedMode: state.acceleratedMode,
        acceleratedTimerDuration: state.acceleratedTimerDuration,
        showSponsors: state.showSponsors,
        sponsorRotationInterval: state.sponsorRotationInterval,
      }),
    }
  )
);
