/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        vibe: {
          black: "#000000",
          white: "#FFFFFF",
          cyan: "#00FFFF",
          magenta: "#FF00FF",
        },
      },
    },
  },
  plugins: [],
}
