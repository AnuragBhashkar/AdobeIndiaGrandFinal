import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getHomePageStyles } from '../../styles/appStyles';

const Footer = () => {
    const { currentTheme } = useTheme();
    const styles = getHomePageStyles(currentTheme);
    return (
        <footer style={styles.footer}>
            <h3>Contact Us</h3>
            <p>For support or inquiries, please reach out to our team at support@example.com.</p>
        </footer>
    );
};

export default Footer;