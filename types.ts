export interface ColorPalette {
  colors: string[];
  name: string;
}

export interface CoverConfig {
  title: string;
  subtitle: string;
  colors: string[];
  speed: number;
  grain: number;
  blur: number; // Visual blur intensity
  scale: number; // Zoom/Scale of the noise
  fontFamily: string; // Font selection
}

export interface GeneratedContent {
  title: string;
  subtitle: string;
  colors: string[];
}