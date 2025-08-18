import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getModalStyles } from '../../styles/appStyles';
import { CloseIcon } from '../common/Icons';
import apiClient from '../../api/apiClient';

const LoginModal = ({ isOpen, onClose, onLogin }) => {
    const { currentTheme } = useTheme();
    const styles = getModalStyles(currentTheme);
    const [isSignup, setIsSignup] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const name = e.target.elements.name?.value;

        try {
            if (isSignup) {
                await apiClient.post('/register', { email, password, name });
                const response = await apiClient.post('/login', { email, password });
                onLogin(response.data.user_name, response.data.access_token);
            } else {
                const response = await apiClient.post('/login', { email, password });
                onLogin(response.data.user_name, response.data.access_token);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred.');
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button style={styles.closeButton} onClick={onClose}>
                    <CloseIcon color={currentTheme.text} />
                </button>
                <h2 style={styles.title}>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    {isSignup && <input name="name" type="text" placeholder="Your Name" style={styles.input} required />}
                    <input name="email" type="email" placeholder="Email Address" style={styles.input} required />
                    <input name="password" type="password" placeholder="Password" style={styles.input} required />
                    {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                    <button type="submit" style={styles.submitButton}>
                        {isSignup ? 'Sign Up' : 'Login'}
                    </button>
                </form>
                <p style={styles.toggleText}>
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}
                    <span onClick={() => setIsSignup(!isSignup)} style={styles.toggleLink}>
                        {isSignup ? ' Login' : ' Sign Up'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default LoginModal;