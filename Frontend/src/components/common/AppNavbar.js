import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getHomePageStyles } from '../../styles/appStyles';
import { AdobeLogo } from './Icons';

const AppNavbar = ({ onNavigate, toggleTheme, isLoggedIn, onLogout, onLoginClick }) => {
    const { currentTheme } = useTheme();
    const styles = getHomePageStyles(currentTheme);
    return (
        <nav style={styles.navbar}>
            <div style={styles.navLeft} onClick={() => onNavigate('home')}>
                <AdobeLogo color={currentTheme.primary} size={32} />
                <span style={styles.logoText}>Adobe PDF AI</span>
            </div>
            <div style={styles.navCenter}>
                <button onClick={() => onNavigate('home')} style={styles.navLink}>Home</button>
                <button onClick={() => onNavigate('about')} style={styles.navLink}>About Us</button>
            </div>
            <div style={styles.navRight}>
                <button onClick={toggleTheme} style={styles.themeButton}>Toggle Theme</button>
                <button onClick={isLoggedIn ? onLogout : onLoginClick} style={styles.loginButton}>
                    {isLoggedIn ? 'Logout' : 'Login'}
                </button>
            </div>
        </nav>
    );
};

export default AppNavbar;