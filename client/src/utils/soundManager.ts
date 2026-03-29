/**
 * Sound Manager - Singleton for managing auction sound effects
 *
 * Sounds:
 * - bid: Played when a new bid is placed
 * - sold: Played when a player is sold
 * - unsold: Played when a player goes unsold
 * - tick: Played during countdown (last 5 seconds)
 * - buzzer: Played when timer expires
 * - whoosh: Played when new player enters auction
 */

type SoundName = 'bid' | 'sold' | 'unsold' | 'tick' | 'buzzer' | 'whoosh';

interface SoundConfig {
  src: string;
  volume?: number; // Override default volume for this sound
}

const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  bid: { src: '/sounds/bid.mp3', volume: 0.8 },
  sold: { src: '/sounds/sold.mp3', volume: 1.0 },
  unsold: { src: '/sounds/unsold.mp3', volume: 0.9 },
  tick: { src: '/sounds/tick.mp3', volume: 0.6 },
  buzzer: { src: '/sounds/buzzer.mp3', volume: 0.9 },
  whoosh: { src: '/sounds/whoosh.mp3', volume: 0.7 },
};

class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;
  private initialized: boolean = false;
  private lastTickTime: number = 0;
  private tickDebounceMs: number = 800; // Prevent tick sounds from overlapping

  /**
   * Initialize and preload all sounds
   * Call this early in the app lifecycle
   */
  init(): void {
    if (this.initialized) return;

    Object.entries(SOUND_CONFIGS).forEach(([name, config]) => {
      try {
        const audio = new Audio(config.src);
        audio.preload = 'auto';
        audio.volume = (config.volume ?? 1) * this.volume;

        // Handle load errors gracefully
        audio.onerror = () => {
          console.warn(`Failed to load sound: ${name}`);
        };

        this.sounds.set(name as SoundName, audio);
      } catch (error) {
        console.warn(`Failed to create audio for: ${name}`, error);
      }
    });

    this.initialized = true;
  }

  /**
   * Play a sound by name
   * @param soundName - The name of the sound to play
   */
  play(soundName: SoundName): void {
    if (!this.enabled) return;

    // Special debounce for tick sounds to prevent overlap
    if (soundName === 'tick') {
      const now = Date.now();
      if (now - this.lastTickTime < this.tickDebounceMs) {
        return;
      }
      this.lastTickTime = now;
    }

    const audio = this.sounds.get(soundName);
    if (!audio) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      // Clone the audio for overlapping plays (except tick)
      if (soundName !== 'tick') {
        const clone = audio.cloneNode() as HTMLAudioElement;
        const config = SOUND_CONFIGS[soundName];
        clone.volume = (config.volume ?? 1) * this.volume;
        clone.play().catch(() => {
          // Ignore autoplay errors - user hasn't interacted yet
        });
      } else {
        // For tick, reset and replay the same audio
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error);
    }
  }

  /**
   * Enable or disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    // Update all loaded sounds
    this.sounds.forEach((audio, name) => {
      const config = SOUND_CONFIGS[name];
      audio.volume = (config.volume ?? 1) * this.volume;
    });
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.sounds.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Initialize on module load
soundManager.init();
