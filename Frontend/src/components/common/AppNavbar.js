import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getHomePageStyles } from '../../styles/appStyles';
import { AdobeLogo } from './Icons';
import ThemeToggle from "./ThemeToggle";

const AppNavbar = ({ onNavigate, isLoggedIn, onLogout, onLoginClick }) => {
  const { theme, toggleTheme, currentTheme } = useTheme();
  const styles = getHomePageStyles(currentTheme);

  return (
    <nav style={styles.navbar}>
      <div style={styles.navLeft} onClick={() => onNavigate("home")}>
        <AdobeLogo color={currentTheme.primary} size={32} />
        <span style={styles.logoText}>Adobe PDF AI</span>
      </div>

      <div style={styles.navCenter}>
        <button onClick={() => onNavigate("home")} style={styles.navLink}>Home</button>
        <button onClick={() => onNavigate("about")} style={styles.navLink}>About Us</button>
      </div>

      <div style={styles.navRight}>
        {/* ✅ cleaner toggle usage */}
        <ThemeToggle toggleTheme={toggleTheme} isDark={theme === "dark"} />

        <button onClick={isLoggedIn ? onLogout : onLoginClick} style={styles.loginButton}>
          {isLoggedIn ? "Logout" : "Login"}
        </button>
      </div>
    </nav>
  );
};

export default AppNavbar;
