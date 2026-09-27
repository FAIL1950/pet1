import type { ThemeOptions } from "@mui/material/styles";

const themeOptions: ThemeOptions = {
  cssVariables: {
    colorSchemeSelector: "class",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#2E7D5B",
          light: "#4E9A77",
          dark: "#1F5C42",
          contrastText: "#FFFFFF",
        },
        secondary: {
          main: "#546E7A",
        },
        background: {
          default: "#F5F8F6",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1B2620",
          secondary: "#4A5A51",
        },
        divider: "rgba(27, 38, 32, 0.12)",
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#6FCF97",
          light: "#9BE0B8",
          dark: "#43A970",
          contrastText: "#0B1F14",
        },
        secondary: {
          main: "#90A4AE",
        },
        background: {
          default: "#0F1613",
          paper: "#16201B",
        },
        text: {
          primary: "#E6EEE9",
          secondary: "rgba(230, 238, 233, 0.7)",
        },
        divider: "rgba(230, 238, 233, 0.12)",
      },
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  },
};

export default themeOptions;
