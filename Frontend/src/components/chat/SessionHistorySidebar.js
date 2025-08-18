import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getPdfChatStyles } from '../../styles/appStyles';
import { HistoryIcon } from '../common/Icons';
import apiClient from '../../api/apiClient';

const SessionHistorySidebar = ({ onSelectSession, onNewChat, activeSessionId, userToken }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

    useEffect(() => {
        if (!userToken) return;
        const fetchSessions = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.get('/sessions/');
                const sortedSessions = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setSessions(sortedSessions);
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSessions();
    }, [activeSessionId, userToken]);

    return (
        <div style={styles.historySidebar}>
            <div style={styles.historyHeader}>
                <HistoryIcon />
                <h3 style={styles.historyTitle}>Chat History</h3>
            </div>
            <button onClick={onNewChat} style={styles.newChatButton}>+ New Chat</button>
            <div style={styles.sessionList}>
                {isLoading ? <p>Loading history...</p> :
                    sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            style={{...styles.sessionItem, ...(session.id === activeSessionId && styles.activeSessionItem)}}
                        >
                            <p style={styles.sessionPersona}>{session.persona || 'Untitled Chat'}</p>
                            <p style={styles.sessionJob}>{session.job}</p>
                            <p style={styles.sessionTimestamp}>{new Date(session.timestamp).toLocaleString()}</p>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default SessionHistorySidebar;