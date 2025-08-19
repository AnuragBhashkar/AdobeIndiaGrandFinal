import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { PaperTrailLogo, MenuIcon, CloseIcon } from './Icons'; // Updated import
import ThemeToggle from "./ThemeToggle";

const AppNavbar = ({ onNavigate, isLoggedIn, onLogout, onLoginClick }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="nav-left" onClick={() => handleNav("home")}>
        <PaperTrailLogo color="var(--primary)" size={32} /> {/* Updated component */}
        <span className="logo-text">PaperTrail</span>
      </div>

      <div className="nav-center">
        <button onClick={() => handleNav("home")} className="nav-link">Home</button>
        <button onClick={() => handleNav("about")} className="nav-link">About Us</button>
        <button onClick={() => handleNav("contact")} className="nav-link">Contact Us</button>
      </div>

      <div className="nav-right">
        <ThemeToggle className="theme-toggle-button" toggleTheme={toggleTheme} isDark={theme === "dark"} />
        <button onClick={isLoggedIn ? onLogout : onLoginClick} className="login-button">
          {isLoggedIn ? "Logout" : "Login"}
        </button>
      </div>

      <div className="hamburger-menu">
        <button className="hamburger-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <CloseIcon color="var(--text)" /> : <MenuIcon />}
        </button>
      </div>
      
      {isMenuOpen && (
        <div className="mobile-menu">
          <button onClick={() => handleNav("home")} className="nav-link">Home</button>
          <button onClick={() => handleNav("about")} className="nav-link">About Us</button>
          <button onClick={() => handleNav("contact")} className="nav-link">Contact Us</button>
          <button onClick={isLoggedIn ? onLogout : onLoginClick} className="login-button">
            {isLoggedIn ? "Logout" : "Login"}
          </button>
           <ThemeToggle toggleTheme={toggleTheme} isDark={theme === "dark"} />
        </div>
      )}
    </nav>
  );
};

export default AppNavbar;