/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        telkom: {
          red: "#c8102e",
          dark: "#1a1a2e",
          gray: "#f4f4f4",
        },
      },
    },
  },
  plugins: [],
};
