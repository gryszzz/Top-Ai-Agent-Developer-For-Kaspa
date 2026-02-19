/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kaspa: {
          mint: "#4ed8c7",
          dark: "#0a1022",
          panel: "#111a33"
        }
      }
    }
  },
  plugins: []
};
