export const theme = {
  colors: {
    background: "#050505",
    surface: "#0a0a0a",
    surfaceSecondary: "#151515",
    primary: "#00f3ff", // Cyan Neon
    secondary: "#ff00ff", // Pink Neon
    accent: "#ffea00", // Yellow Neon
    text: "#ffffff",
    textSecondary: "#aaaaaa",
    danger: "#ff0033",
    success: "#00ff66",
    border: "#333333",
  },
  fonts: {
    arcade: '"Press Start 2P", cursive',
    main: '"Inter", sans-serif',
  },
  shadows: {
    neonPrimary:
      "0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.2)",
    neonSecondary:
      "0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.2)",
  },
  transitions: {
    default: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

export type ThemeType = typeof theme;
