import React from "react";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ toggleTheme, isDark }) => {
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-button"
    >
      {isDark ? (
        <Moon size={20} color="white" />
      ) : (
        <Sun size={20} color="grey" />
      )}
    </button>
  );
};

export default ThemeToggle;