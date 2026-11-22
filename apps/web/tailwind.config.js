export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf8f5",
          100: "#d0ede3",
          600: "#217563",
          700: "#195c4e",
          900: "#123d35",
        },
      },
      fontFamily: { sans: ["Be Vietnam Pro", "sans-serif"] },
    },
  },
  plugins: [],
};
