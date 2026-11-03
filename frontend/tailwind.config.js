export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Sora", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] },
      colors: { neon: { cyan: "#22d3ee", violet: "#a78bfa", pink: "#f472b6", lime: "#34d399", amber: "#fb923c" } },
    },
  },
  plugins: [],
};
