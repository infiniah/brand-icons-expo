/** The same palette the other three samples use, so Marks is one product on four platforms. */
export interface Theme {
  canvas: string;
  card: string;
  hairline: string;
  title: string;
  secondary: string;
  tertiary: string;
  canvasLuminance: number;
  cardLuminance: number;
}

export const light: Theme = {
  canvas: '#f4f4f2',
  card: '#ffffff',
  hairline: '#e6e5e1',
  title: '#14161a',
  secondary: '#6c7076',
  tertiary: '#9ca1a7',
  canvasLuminance: 0.956,
  cardLuminance: 1,
};

export const dark: Theme = {
  canvas: '#0e0f11',
  card: '#191b1e',
  hairline: '#2a2d31',
  title: '#f4f4f2',
  secondary: '#9aa0a6',
  tertiary: '#6e747a',
  canvasLuminance: 0.059,
  cardLuminance: 0.104,
};
