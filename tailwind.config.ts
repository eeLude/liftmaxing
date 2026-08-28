/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#004cff",
          dark: "#003acc",
          light: "#3366ff",
        },
        surface: {
          DEFAULT: "#18181b",
          raised: "#27272a",
          border: "#3f3f46",
        },
      },
    },
  },
  plugins: [],
};
