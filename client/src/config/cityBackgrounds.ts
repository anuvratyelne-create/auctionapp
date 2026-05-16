// City Layout Background Options
// Supports both images and videos

export interface CityBackground {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string; // For preview in settings
  brightness?: number; // 0-1, default 0.6
  description?: string;
}

export const cityBackgrounds: CityBackground[] = [
  {
    id: 'city-night-skyline',
    name: 'Night Skyline',
    type: 'image',
    url: '/images/city-night-bg.png',
    thumbnail: '/images/city-night-bg.png',
    brightness: 0.6,
    description: 'Beautiful city skyline with river lights',
  },
  {
    id: 'city-aerial',
    name: 'Aerial View',
    type: 'image',
    url: '/images/city-aerial-bg.jpg',
    thumbnail: '/images/city-aerial-bg.jpg',
    brightness: 0.5,
    description: 'Bird\'s eye view of city at night',
  },
  {
    id: 'city-neon',
    name: 'Neon City',
    type: 'image',
    url: '/images/city-neon-bg.jpg',
    thumbnail: '/images/city-neon-bg.jpg',
    brightness: 0.7,
    description: 'Cyberpunk style neon cityscape',
  },
  {
    id: 'city-timelapse',
    name: 'City Timelapse',
    type: 'video',
    url: '/images/city-timelapse.mp4',
    thumbnail: '/images/city-timelapse-thumb.jpg',
    brightness: 0.5,
    description: 'Animated city traffic timelapse',
  },
  {
    id: 'city-drone',
    name: 'Drone Flyover',
    type: 'video',
    url: '/images/city-drone.mp4',
    thumbnail: '/images/city-drone-thumb.jpg',
    brightness: 0.6,
    description: 'Cinematic drone footage of city',
  },
  {
    id: 'city-cyberpunk-neon',
    name: 'Cyberpunk Neon',
    type: 'image',
    url: '/images/city-cyberpunk-neon.png',
    thumbnail: '/images/city-cyberpunk-neon.png',
    brightness: 0.5,
    description: 'Futuristic cyberpunk city with neon signs',
  },
  {
    id: 'city-chicago-aerial',
    name: 'Chicago Aerial',
    type: 'image',
    url: '/images/city-chicago-aerial.png',
    thumbnail: '/images/city-chicago-aerial.png',
    brightness: 0.55,
    description: 'Dark aerial view of Chicago at night',
  },
  {
    id: 'city-nyc-bridge',
    name: 'NYC Brooklyn Bridge',
    type: 'image',
    url: '/images/city-nyc-bridge.png',
    thumbnail: '/images/city-nyc-bridge.png',
    brightness: 0.6,
    description: 'New York City with Brooklyn Bridge reflections',
  },
];

export const defaultCityBackground = 'city-night-skyline';

export function getCityBackground(id: string): CityBackground | undefined {
  return cityBackgrounds.find(bg => bg.id === id);
}
