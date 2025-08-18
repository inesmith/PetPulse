// gluestack-ui.config.ts
import { createConfig } from '@gluestack-style/react';

// --- your design tokens (source of truth) ---
const colors = {
  blue:  '#73C3D1',
  white: '#F8F7F4',
  o:     '#EE734A',   // accent "orange" you used as `o`
  text:  '#1C1C1C',
  gray:  '#D7D7D7',
  dark:  '#6B6B6B',
};

const fonts = {
  heading: 'Staatliches',
  body:    'Inter',
  mono:    'Barlow Semi Condensed',
};

// --- Gluestack config (what <GluestackUIProvider /> expects) ---
export const config = createConfig({
  tokens: {
    colors,
    fonts,
  },
  aliases: undefined
}) as any;

// --- ⬇️ Back-compat shim so existing code keeps working ⬇️ ---
// Many screens read `(config as any)?.theme?.colors.blue`.
// Expose a `.theme` with the same shape so you don't have to touch screens.
config.theme = {
  colors,
  fonts,
};

export default config;
