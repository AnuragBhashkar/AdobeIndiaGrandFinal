import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePageStyles } from '../styles/appStyles';
import Footer from '../components/common/Footer';

const AboutUsPage = () => {
    const { currentTheme } = useTheme();
    const styles = getHomePageStyles(currentTheme);
    return (
        <div style={{...styles.pageContainer, minHeight: 'calc(100vh - 145px)'}}>
            <div style={styles.projectSection}>
                <h2 style={styles.sectionTitle}>Our Mission</h2>
                <p style={styles.sectionText}>
                    Our mission is to bridge the gap between static documents and dynamic, intelligent interaction. We believe that information should be accessible and easy to work with. This project was born from the idea that your documents hold valuable data, and accessing it should be as simple as having a conversation. We are a team of developers and AI enthusiasts passionate about building tools that make information more powerful and intuitive for everyone.
                </p>
            </div>
            <Footer />
        </div>
    );
};

export default AboutUsPage;