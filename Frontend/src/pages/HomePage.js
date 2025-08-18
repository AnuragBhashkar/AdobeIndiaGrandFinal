import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePageStyles } from '../styles/appStyles';
import LoginModal from '../components/auth/LoginModal';
import Footer from '../components/common/Footer';

const HomePage = ({ onNavigate, onLogin, isLoggedIn, userName }) => {
  const { currentTheme } = useTheme();
  const styles = getHomePageStyles(currentTheme);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLaunchClick = () => {
      if (isLoggedIn) {
          onNavigate('chat');
      } else {
          setIsModalOpen(true);
      }
  };

  return (
    <div style={styles.pageContainer}>
        <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogin={onLogin} />
        <header style={styles.hero}>
            <div style={styles.heroContent}>
                {isLoggedIn && <h2 style={styles.greeting}>Hey, {userName}!</h2>}
                <h1 style={styles.heroTitle}>PDF Intelligence, Powered by AI</h1>
                <p style={styles.heroSubtitle}>
                Upload your documents and interact with them like never before.
                </p>
                <button onClick={handleLaunchClick} style={styles.ctaButton}>
                Launch PDF Chat App
                </button>
            </div>
        </header>
        <section style={styles.projectSection}>
            <h2 style={styles.sectionTitle}>About the Project</h2>
            <p style={styles.sectionText}>
                This application is a powerful tool designed to revolutionize the way you interact with your PDF documents. By leveraging the capabilities of modern Large Language Models (LLMs), we provide a seamless conversational interface that allows you to "talk" to your files. You can ask complex questions, request summaries of lengthy reports, extract key information, and get insights in seconds, all without manually scrolling through pages.
            </p>
        </section>
        <Footer />
    </div>
  );
};

export default HomePage;