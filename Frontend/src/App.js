// src/App.js

import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import PdfViewer from './PdfViewer'; // Import the new, reliable PdfViewer

// --- SVG Icons (re-usable) ---
const AdobeLogo = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.51,2.09L22,22H16.63L14.51,17.2H9.49L7.37,22H2L9.49,2.09H14.51M12,5.43L10.33,14.41H13.67L12,5.43Z" fill={color} />
  </svg>
);
const CloseIcon = ({ color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill={color}/>
    </svg>
);
const HistoryIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="currentColor"/>
    </svg>
);

// Custom hook for typing animation
const useTypingEffect = (textToType, speed = 20) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        setDisplayedText('');
        setIsDone(false);
        if (!textToType) return;

        let i = 0;
        const intervalId = setInterval(() => {
            if (i < textToType.length) {
                setDisplayedText(textToType.substring(0, i + 1));
                i++;
            } else {
                clearInterval(intervalId);
                setIsDone(true);
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, [textToType, speed]);

    return { displayedText, isDone };
};

// --- Login/Signup Modal Component ---
const LoginModal = ({ isOpen, onClose, onLogin }) => {
    const { currentTheme } = useTheme();
    const styles = getModalStyles(currentTheme);
    const [isSignup, setIsSignup] = useState(false);

    if (!isOpen) return null;

    const handleLogin = (e) => {
        e.preventDefault();
        const name = e.target.elements.name?.value || 'User';
        onLogin(name);
        onClose();
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button style={styles.closeButton} onClick={onClose}>
                    <CloseIcon color={currentTheme.text} />
                </button>
                <h2 style={styles.title}>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
                <form onSubmit={handleLogin} style={styles.form}>
                    {isSignup && <input name="name" type="text" placeholder="Your Name" style={styles.input} required />}
                    <input type="email" placeholder="Email Address" style={styles.input} required />
                    <input type="password" placeholder="Password" style={styles.input} required />
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

// --- Home Page & About Page Components ---
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

// --- Shared Components (Navbar & Footer) ---
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

// ------------------ PDF Chat Page and its Children ------------------

// --- Session History Sidebar ---
const SessionHistorySidebar = ({ onSelectSession, onNewChat, activeSessionId }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

    useEffect(() => {
        const fetchSessions = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get('http://localhost:8000/sessions/');
                const sortedSessions = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setSessions(sortedSessions);
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSessions();
    }, [activeSessionId]);

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

const PdfChatPage = () => {
    const styles = getPdfChatStyles(useTheme().currentTheme);

    const [sessionId, setSessionId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [messages, setMessages] = useState([]);

    const [pdfs, setPdfs] = useState([]);
    const [selectedPDF, setSelectedPDF] = useState(null);
    const [persona, setPersona] = useState('');
    const [job, setJob] = useState('');
    const [filePromise, setFilePromise] = useState(null);
    const [targetPage, setTargetPage] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [translatedInsights, setTranslatedInsights] = useState(null);

    // --- NEW STATE for selection insights ---
    const [selectionInsights, setSelectionInsights] = useState(null);
    const [isSelectionLoading, setIsSelectionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'selection'


    const handlePDFSelect = (pdf) => {
        if (selectedPDF?.name !== pdf.name) {
            setSelectedPDF(pdf);
            setFilePromise(pdf.arrayBuffer());
            setTargetPage(1);
        }
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        const newPdfs = files.filter(file =>
            file.type === 'application/pdf' && !pdfs.some(p => p.name === file.name)
        );
        setPdfs(prev => [...prev, ...newPdfs]);
    };

    const handleStartAnalysis = async () => {
        if (pdfs.length === 0 || !persona || !job) {
            setError('Please upload PDFs and fill out both Persona and Job fields.');
            return;
        }

        setLoading(true);
        setError('');
        setTranslatedInsights(null);

        const formData = new FormData();
        formData.append('persona', persona);
        formData.append('job_to_be_done', job);
        pdfs.forEach(pdfFile => formData.append('files', pdfFile));
        
        if (sessionId) {
            formData.append('sessionId', sessionId);
        }

        try {
            const response = await axios.post('http://localhost:8000/analyze/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSessionId(response.data.sessionId);
            setAnalysisResult(response.data.analysis);
            setMessages([{ role: 'bot', content: 'Analysis complete! Here are the key insights.' }]);

        } catch (err) {
            const errorMessage = err.response?.data?.detail || 'An unexpected error occurred during analysis.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSendQuery = async (msg) => {
        if (!sessionId) return;
        const userMsg = { role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:8000/chat/', {
                sessionId: sessionId,
                query: msg,
            });
            setMessages(prev => [...prev, response.data]);
        } catch (err) {
            const errorMessage = err.response?.data?.detail || 'Failed to get a response.';
            setMessages(prev => [...prev, { role: 'bot', content: `Error: ${errorMessage}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = async (selectedSessionId) => {
        setLoading(true);
        setError('');
        setTranslatedInsights(null);
        try {
            const response = await axios.get(`http://localhost:8000/sessions/${selectedSessionId}`);
            const sessionData = response.data;
            setSessionId(selectedSessionId);
            setAnalysisResult(sessionData.analysis);
            setMessages(sessionData.chat_history);
            setPdfs([]);
            setSelectedPDF(null);
            setFilePromise(null);
            if (sessionData.file_paths && sessionData.file_paths.length > 0) {
            const filePromises = sessionData.file_paths.map(async (path) => {
                const fileName = path.split('/').pop();
                const fileResponse = await axios.get(`http://localhost:8000${path}`, {
                    responseType: 'blob',
                });
                return new File([fileResponse.data], fileName, { type: 'application/pdf' });
            });
            const loadedPdfs = await Promise.all(filePromises);
            setPdfs(loadedPdfs);

            // Automatically select the first PDF to display
            if (loadedPdfs.length > 0) {
                handlePDFSelect(loadedPdfs[0]);
            }
        } else {
            setPdfs([]);
            setSelectedPDF(null);
            setFilePromise(null);
        }
        } catch (err) {
            setError("Failed to load session.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setSessionId(null);
        setAnalysisResult(null);
        setMessages([]);
        setPdfs([]);
        setSelectedPDF(null);
        setPersona('');
        setJob('');
        setError('');
        setTranslatedInsights(null);
        setSelectionInsights(null); // Reset on new chat
        setActiveTab('analysis');
    };

    const handleInsightClick = (insight) => {
        const pdfFile = pdfs.find(p => p.name === insight.document);
        if (pdfFile) {
            if (selectedPDF?.name !== pdfFile.name) {
                setSelectedPDF(pdfFile);
                setFilePromise(pdfFile.arrayBuffer());
            }
            setTargetPage(insight.page_number || 1);
        }
    };

    // --- NEW FUNCTION to handle text selection ---
    const handleTextSelect = async (selectedText) => {
        if (!selectedText || isSelectionLoading) return;
        setIsSelectionLoading(true);
        setSelectionInsights(null);
        setActiveTab('selection'); // Switch to selection tab

        try {
            const response = await axios.post('http://localhost:8000/insights-on-selection', {
                text: selectedText,
            });
            setSelectionInsights(response.data);
        } catch (err) {
            console.error("Failed to get insights on selection:", err);
            // You can set an error state here to show in the UI
        } finally {
            setIsSelectionLoading(false);
        }
    };


    return (
        <div style={styles.appContainer}>
            <SessionHistorySidebar
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                activeSessionId={sessionId}
            />
            <div style={styles.mainContent}>
                <div style={styles.viewerPanel}>
                    {filePromise && selectedPDF ? ( // ERROR FIX: Ensure selectedPDF is not null
                        <PdfViewer
                            filePromise={filePromise}
                            fileName={selectedPDF.name} // This line is now safe
                            pageNumber={targetPage}
                            onTextSelect={handleTextSelect}
                        />
                    ) : (
                        <div style={styles.viewerPlaceholder}>
                            <p>{sessionId ? "PDF viewer is disabled for past sessions." : "Select a PDF to view it here."}</p>
                        </div>
                    )}
                </div>

                <div style={styles.chatPanel}>
                    <div style={styles.chatControls}>
                        <label htmlFor="file-upload" style={styles.uploadButton}>Upload PDFs</label>
                        <input id="file-upload" type="file" accept="application/pdf" multiple onChange={handleFileChange} style={{ display: 'none' }}/>
                        <div style={styles.pdfList}>
                            {pdfs && pdfs.map((pdf) => (
                                <button key={pdf.name} onClick={() => handlePDFSelect(pdf)} style={{...styles.pdfListItem, ...(selectedPDF?.name === pdf.name && styles.activePdfListItem)}}>
                                    {pdf.name}
                                </button>
                            ))}
                        </div>
                        <input type="text" placeholder="Persona (e.g., 'a legal expert')" value={persona} onChange={(e) => setPersona(e.target.value)} style={styles.input}/>
                        <textarea placeholder="Job to be done (e.g., 'summarize key risks')" value={job} onChange={(e) => setJob(e.target.value)} style={{...styles.input, ...styles.textarea}}/>
                        <button onClick={handleStartAnalysis} style={styles.button} disabled={loading}>
                            {loading ? 'Analyzing...' : 'Generate Insights'}
                        </button>
                        {error && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                    </div>

                    {!analysisResult ? (
                        <div style={styles.chatBox}>
                           <div style={styles.placeholderText}>Upload documents and define your analysis goals to begin.</div>
                        </div>
                    ) : (
                        <ChatAndAnalysisSection
                            messages={messages}
                            onSendMessage={handleSendQuery}
                            loading={loading}
                            analysisResult={analysisResult}
                            onInsightClick={handleInsightClick}
                            sessionId={sessionId}
                            translatedInsights={translatedInsights}
                            setTranslatedInsights={setTranslatedInsights}
                            selectionInsights={selectionInsights}
                            isSelectionLoading={isSelectionLoading}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Component for the initial "New Chat" screen ---
const NewChatSetup = ({
    pdfs, onFileChange, onSelectPDF, selectedPDF, persona, setPersona, job, setJob, onStartAnalysis, loading, error,
    selectionInsights, isSelectionLoading, activeTab, setActiveTab
}) => {
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

    return (
        <div style={styles.chatPanel}>
            <div style={styles.tabsContainer}>
                <button
                    style={{...styles.tabButton, ...(activeTab === 'analysis' && styles.activeTab)}}
                    onClick={() => setActiveTab('analysis')}
                >
                    Start New Analysis
                </button>
                <button
                    style={{...styles.tabButton, ...(activeTab === 'selection' && styles.activeTab)}}
                    onClick={() => setActiveTab('selection')}
                >
                    Contextual Insights
                </button>
            </div>

            {activeTab === 'analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={styles.chatControls}>
                        <label htmlFor="file-upload" style={styles.uploadButton}>Upload PDFs</label>
                        <input id="file-upload" type="file" accept="application/pdf" multiple onChange={onFileChange} style={{ display: 'none' }}/>
                        <div style={styles.pdfList}>
                            {pdfs && pdfs.map((pdf) => (
                                <button key={pdf.name} onClick={() => onSelectPDF(pdf)} style={{...styles.pdfListItem, ...(selectedPDF?.name === pdf.name && styles.activePdfListItem)}}>
                                    {pdf.name}
                                </button>
                            ))}
                        </div>
                        <input type="text" placeholder="Persona (e.g., 'a legal expert')" value={persona} onChange={(e) => setPersona(e.target.value)} style={styles.input}/>
                        <textarea placeholder="Job to be done (e.g., 'summarize key risks')" value={job} onChange={(e) => setJob(e.target.value)} style={{...styles.input, ...styles.textarea}}/>
                        <button onClick={onStartAnalysis} style={styles.button} disabled={loading}>
                            {loading ? 'Analyzing...' : 'Start Analysis'}
                        </button>
                        {error && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                    </div>
                    <div style={styles.chatBox}>
                        <div style={styles.placeholderText}>Upload documents and define your analysis goals to begin.</div>
                    </div>
                </div>
            )}

            {activeTab === 'selection' && (
                <div style={{...styles.insightsPanel, maxHeight: '100%', height: '100%'}}>
                    <div style={styles.selectionInsightsContainer}>
                        {isSelectionLoading && <div style={styles.loadingIndicator}>Generating insights...</div>}
                        {selectionInsights ? (
                            <div>
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Summary</h6>
                                    <p>{selectionInsights.summary}</p>
                                </div>
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Key Takeaways</h6>
                                    <ul>
                                        {selectionInsights.key_takeaways.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Potential Questions</h6>
                                    <ul>
                                        {selectionInsights.potential_questions.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.placeholderText}>
                                Select text in the PDF and click "Get Insights on Selection" to see details here.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const AnimatedBotMessage = ({ message }) => {
    const { displayedText, isDone } = useTypingEffect(message.content);
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

    return (
        <div style={{...styles.chatMessage, ...styles.botMessage}}>
            {displayedText}
            {!isDone && <span style={styles.typingCursor}>|</span>}
        </div>
    );
};

// --- ChatAndAnalysisSection for active chats ---
const ChatAndAnalysisSection = ({
    messages, onSendMessage, loading, analysisResult, onInsightClick,
    translatedInsights, setTranslatedInsights, sessionId,
    selectionInsights, isSelectionLoading, activeTab, setActiveTab
}) => {
  const { currentTheme } = useTheme();
  const styles = getPdfChatStyles(currentTheme);
  const [input, setInput] = useState('');
  const chatBoxRef = useRef(null);

  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [podcastLanguage, setPodcastLanguage] = useState('en');

  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translationError, setTranslationError] = useState('');

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages, loading, audioUrl, analysisResult, translatedInsights, selectionInsights]);

  const handleSend = () => { if (!input.trim()) return; onSendMessage(input); setInput(''); };

  const handleTranslateToHindi = async () => {
    if (!sessionId) return;
    setIsTranslatingAll(true);
    setTranslationError('');
    try {
        const response = await axios.post('http://localhost:8000/translate-insights/', { sessionId });
        setTranslatedInsights(response.data.translated_insights);
    } catch (err) {
        setTranslationError('Failed to translate insights to Hindi.');
        console.error("Translation error:", err);
    } finally {
        setIsTranslatingAll(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!analysisResult) return;
    setIsPodcastLoading(true);
    setAudioUrl(null);
    try {
        const response = await axios.post('http://localhost:8000/generate-podcast/', {
            analysis_data: analysisResult,
            language: podcastLanguage
        }, { responseType: 'blob' });

        const url = URL.createObjectURL(response.data);
        setAudioUrl(url);

    } catch (err) {
        console.error("Error generating podcast:", err);
    } finally {
        setIsPodcastLoading(false);
    }
  };

  // Use translated insights if available, otherwise fall back to original
  const displayInsights = translatedInsights || analysisResult?.llm_insights;

  return (
    <>
        <div style={styles.tabsContainer}>
            <button
                style={{...styles.tabButton, ...(activeTab === 'analysis' && styles.activeTab)}}
                onClick={() => setActiveTab('analysis')}
            >
                Generated Insights
            </button>
            <button
                style={{...styles.tabButton, ...(activeTab === 'selection' && styles.activeTab)}}
                onClick={() => setActiveTab('selection')}
            >
                Selection Insights
            </button>
        </div>

        <div style={styles.insightsPanel}>
            {activeTab === 'analysis' && analysisResult && (
                <div style={styles.analysisResult}>
                    <h4>Initial Insights:</h4>
                      {analysisResult.top_sections?.slice(0, 3).map((section, idx) => (
                          <div key={idx} style={styles.analysisSnippet} onClick={() => onInsightClick(section)}>
                              <p style={styles.analysisReason}><strong>From {section.document}:</strong> {section.reasoning}</p>
                              <p style={styles.sectionTitleText}>Section: "{section.section_title}"</p>
                              <p style={styles.sectionContentText}>{section.subsection_analysis}</p>
                              <div style={styles.snippetFooter}>
                                  <small>Page: {section.page_number > 0 ? section.page_number : 'N/A'}</small>
                              </div>
                          </div>
                      ))}

                    {analysisResult.llm_insights && (
                        <div style={styles.llmInsightsContainer}>
                            <div style={styles.insightsHeader}>
                                <h4>Enhanced Insights from Gemini</h4>
                                <div style={styles.translateAllContainer}>
                                    {isTranslatingAll && <span style={{fontSize: '0.9rem', marginRight: '8px'}}>Translating...</span>}
                                    {translatedInsights ? (
                                        <button onClick={() => setTranslatedInsights(null)} style={styles.showOriginalButton}>Show Original</button>
                                    ) : (
                                        <button onClick={handleTranslateToHindi} style={styles.button} disabled={isTranslatingAll || loading}>
                                            Translate to Hindi
                                        </button>
                                    )}
                                </div>
                            </div>
                            {translationError && <p style={{color: 'red'}}>{translationError}</p>}
                            {displayInsights && (
                                <>
                                    {displayInsights.key_insights?.length > 0 && (
                                        <div style={styles.insightCategory}>
                                            <h6 style={styles.insightCategoryTitle}>Key Insights</h6>
                                            <ul>{displayInsights.key_insights.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                        </div>
                                    )}
                                    {displayInsights.did_you_know?.length > 0 && (
                                        <div style={styles.insightCategory}>
                                            <h6 style={styles.insightCategoryTitle}>Did You Know?</h6>
                                            <ul>{displayInsights.did_you_know.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                        </div>
                                    )}
                                    {displayInsights.cross_document_connections?.length > 0 && (
                                        <div style={styles.insightCategory}>
                                            <h6 style={styles.insightCategoryTitle}>Connections Across Documents</h6>
                                            <ul>{displayInsights.cross_document_connections.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    <div style={styles.podcastContainer}>
                        <div style={styles.podcastControls}>
                            <button onClick={handleGeneratePodcast} style={styles.button} disabled={isPodcastLoading || loading}>{isPodcastLoading ? 'Generating...' : '🎧 Generate Podcast'}</button>
                            <select value={podcastLanguage} onChange={e => setPodcastLanguage(e.target.value)} style={styles.languageSelector} disabled={isPodcastLoading || loading}>
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>
                        {audioUrl && <audio controls src={audioUrl} style={styles.audioPlayer} />}
                    </div>
                </div>
            )}
            {activeTab === 'selection' && (
                <div style={styles.selectionInsightsContainer}>
                    {isSelectionLoading && <div style={styles.loadingIndicator}>Generating insights...</div>}
                    {selectionInsights && (
                        <div>
                            <div style={styles.insightCategory}>
                                <h6 style={styles.insightCategoryTitle}>Summary</h6>
                                <p>{selectionInsights.summary}</p>
                            </div>
                            <div style={styles.insightCategory}>
                                <h6 style={styles.insightCategoryTitle}>Key Takeaways</h6>
                                <ul>
                                    {selectionInsights.key_takeaways.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div style={styles.insightCategory}>
                                <h6 style={styles.insightCategoryTitle}>Potential Questions</h6>
                                <ul>
                                    {selectionInsights.potential_questions.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                    {!isSelectionLoading && !selectionInsights && (
                        <div style={styles.placeholderText}>
                            Select text in the PDF and click "Get Insights on Selection" to see details here.
                        </div>
                    )}
                </div>
            )}
        </div>

        <div ref={chatBoxRef} style={styles.chatBox}>
            {messages.map((msg, idx) => (
                msg.role === 'user' ? (
                    <div key={idx} style={{...styles.chatMessage, ...styles.userMessage}}>{msg.content}</div>
                ) : (
                    <AnimatedBotMessage key={idx} message={msg} />
                )
            ))}
            {loading && <div style={styles.loadingIndicator}>Thinking...</div>}
        </div>
        <div style={styles.chatInputContainer}>
            <input type="text" placeholder="Ask a follow-up..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} style={styles.input} disabled={!analysisResult || loading}/>
            <button onClick={handleSend} style={styles.button} disabled={!analysisResult || loading}>Send</button>
        </div>
    </>
  );
};

// --- Theme and Styles Definitions ---
const themes = {
  light: { background: '#ffffff', text: '#121212', primary: '#e50914', secondary: '#f5f5f1', border: '#e0e0e0', header: '#121212', buttonText: '#ffffff', inputBg: '#f0f0f0', activeItem: '#e50914', activeItemText: '#ffffff', messageBgUser: '#e0e0e0', messageTextUser: '#121212', messageBgBot: '#f5f5f1', messageTextBot: '#121212' },
  dark: { background: '#121212', text: '#ffffff', primary: '#e50914', secondary: '#1c1c1c', border: '#2d2d2d', header: '#ffffff', buttonText: '#ffffff', inputBg: '#2d2d2d', activeItem: '#e50914', activeItemText: '#ffffff', messageBgUser: '#333333', messageTextUser: '#ffffff', messageBgBot: '#2d2d2d', messageTextBot: '#ffffff' },
};
const ThemeContext = createContext();
const ThemeContextProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const currentTheme = themes[theme];
  useEffect(() => { document.body.style.backgroundColor = currentTheme.background; }, [currentTheme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme, currentTheme }}>{children}</ThemeContext.Provider>;
};
const useTheme = () => useContext(ThemeContext);

// --- Main App Router ---
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogin = (name) => {
      setIsLoggedIn(true);
      setUserName(name);
      setIsModalOpen(false);
  };
  const handleLogout = () => {
      setIsLoggedIn(false);
      setUserName('');
      setCurrentPage('home');
  };

  const renderPage = () => {
      switch (currentPage) {
          case 'chat':
              return isLoggedIn ? <PdfChatPage /> : <HomePage onNavigate={setCurrentPage} onLogin={handleLogin} isLoggedIn={isLoggedIn} userName={userName} />;
          case 'about':
              return <AboutUsPage />;
          case 'home':
          default:
              return <HomePage onNavigate={setCurrentPage} onLogin={handleLogin} isLoggedIn={isLoggedIn} userName={userName} />;
      }
  };

  return (
      <div>
          <style>{`
              @keyframes blink { 50% { opacity: 0; } }
              .typingCursor { animation: blink 1s step-end infinite; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
          <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogin={handleLogin} />
          <AppNavbar
              onNavigate={setCurrentPage}
              toggleTheme={useTheme().toggleTheme}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              onLoginClick={() => setIsModalOpen(true)}
          />
          {renderPage()}
      </div>
  );
}

// --- Styles Functions ---
const getHomePageStyles = (theme) => ({
    pageContainer: { backgroundColor: theme.background, color: theme.text, fontFamily: "'Segoe UI', Roboto, sans-serif" },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 2rem', backgroundColor: theme.secondary, borderBottom: `1px solid ${theme.border}` },
    navLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
    logoText: { fontWeight: 'bold', fontSize: '1.5rem', color: theme.header },
    navCenter: { display: 'flex', gap: '2rem' },
    navLink: { color: theme.text, fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', textDecoration: 'none' },
    navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    themeButton: { padding: '0.5rem 1rem', backgroundColor: 'transparent', color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '5px', cursor: 'pointer' },
    loginButton: { padding: '0.5rem 1.5rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    hero: { backgroundColor: theme.secondary, textAlign: 'center', padding: '6rem 2rem' },
    heroContent: { maxWidth: '800px', margin: '0 auto' },
    greeting: { color: theme.primary, fontSize: '2rem', margin: '0 0 0.5rem 0' },
    heroTitle: { fontSize: '3.5rem', fontWeight: 'bold', margin: '0', color: theme.header },
    heroSubtitle: { fontSize: '1.25rem', maxWidth: '600px', margin: '1rem auto 2rem auto', color: theme.text, opacity: 0.8 },
    ctaButton: { padding: '1rem 2.5rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' },
    projectSection: { padding: '4rem 2rem', textAlign: 'center', backgroundColor: theme.background },
    sectionTitle: { fontSize: '2.5rem', color: theme.header, marginBottom: '1rem' },
    sectionText: { fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto', opacity: 0.9 },
    footer: { padding: '3rem 2rem', textAlign: 'center', backgroundColor: theme.secondary, borderTop: `1px solid ${theme.border}` },
});
const getModalStyles = (theme) => ({
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: theme.secondary, padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '400px', position: 'relative' },
    closeButton: { position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' },
    title: { textAlign: 'center', margin: '0 0 1.5rem 0', color: theme.header },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    input: { padding: '0.75rem', borderRadius: '5px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text },
    submitButton: { padding: '0.75rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    toggleText: { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' },
    toggleLink: { color: theme.primary, cursor: 'pointer', fontWeight: 'bold' },
});

const getPdfChatStyles = (theme) => ({
    appContainer: { display: 'flex', height: 'calc(100vh - 49px)', backgroundColor: theme.background, color: theme.text, fontFamily: "'Segoe UI', Roboto, sans-serif" },
    historySidebar: { width: '280px', backgroundColor: theme.secondary, padding: '1rem', borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' },
    historyHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.header, paddingBottom: '1rem', borderBottom: `1px solid ${theme.border}` },
    historyTitle: { margin: 0, fontSize: '1.2rem' },
    newChatButton: { width: '100%', padding: '0.75rem', margin: '1rem 0', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    sessionList: { flexGrow: 1, overflowY: 'auto' },
    sessionItem: { padding: '0.75rem', borderRadius: '5px', marginBottom: '0.5rem', cursor: 'pointer', border: `1px solid ${theme.border}` },
    activeSessionItem: { backgroundColor: theme.primary, color: theme.activeItemText, borderColor: theme.primary },
    sessionPersona: { margin: '0 0 0.25rem 0', fontWeight: 'bold' },
    sessionJob: { margin: 0, fontSize: '0.9rem', opacity: 0.8 },
    sessionTimestamp: { margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.6 },
    mainContent: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
    viewerPanel: { flex: 0.6, display: 'flex', flexDirection: 'column', backgroundColor: theme.background, position: 'relative', borderRight: `1px solid ${theme.border}` },
    viewerPlaceholder: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', textAlign: 'center', color: theme.text, opacity: 0.7 },
    chatPanel: { flex: 1, backgroundColor: theme.secondary, padding: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'hidden' },
    sidebarTitle: { margin: '0 0 1rem 0', color: theme.header, borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem' },
    chatControls: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
    uploadButton: { padding: '0.75rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'center' },
    pdfList: { display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 0' },
    pdfListItem: { padding: '0.4rem 0.8rem', borderRadius: '5px', cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.text },
    activePdfListItem: { backgroundColor: theme.activeItem, color: theme.activeItemText, fontWeight: 'bold', borderColor: theme.primary },
    chatInputContainer: { display: 'flex', gap: '0.5rem', marginTop: 'auto', flexShrink: 0 },
    input: { flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '5px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, width: 'calc(100% - 1.5rem)' },
    textarea: { minHeight: '60px', resize: 'vertical', fontFamily: "'Segoe UI', Roboto, sans-serif" },
    button: { padding: '0.75rem 1.5rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    chatMessage: { padding: '0.75rem 1rem', borderRadius: '12px', maxWidth: '85%', lineHeight: '1.4' },
    userMessage: { backgroundColor: theme.messageBgUser, color: theme.messageTextUser, alignSelf: 'flex-end', borderBottomRightRadius: '2px' },
    botMessage: { backgroundColor: theme.messageBgBot, color: theme.messageTextBot, alignSelf: 'flex-start', borderBottomLeftRadius: '2px' },
    loadingIndicator: { alignSelf: 'center', color: theme.text, opacity: 0.8, fontStyle: 'italic', padding: '1rem' },
    placeholderText: { textAlign: 'center', opacity: 0.7, margin: 'auto' },
    analysisResult: { padding: '0.5rem', backgroundColor: theme.background, borderRadius: '8px', marginBottom: '1rem' },
    analysisSnippet: { borderLeft: `3px solid ${theme.primary}`, padding: '10px', margin: '10px 0', backgroundColor: theme.inputBg, borderRadius: '4px', cursor: 'pointer', opacity: 0, animation: 'fadeIn 0.5s forwards' },
    analysisReason: { fontStyle: 'italic', opacity: 0.9, marginBottom: '8px', fontSize: '0.9rem' },
    sectionTitleText: { fontWeight: 'bold', margin: '0 0 8px 0' },
    snippetFooter: { textAlign: 'right', fontSize: '0.8rem', opacity: 0.7, marginTop: '8px' },
    llmInsightsContainer: { marginTop: '1.5rem', padding: '1rem', backgroundColor: theme.secondary, borderRadius: '8px', border: `1px solid ${theme.border}` },
    insightsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    translateAllContainer: { display: 'flex', alignItems: 'center' },
    insightCategory: { marginBottom: '1rem' },
    insightCategoryTitle: { margin: '0 0 0.5rem 0', color: theme.header, fontWeight: 'bold', fontSize: '1.1rem' },
    podcastContainer: { marginTop: '1.5rem', padding: '1rem', backgroundColor: theme.secondary, borderRadius: '8px', border: `1px solid ${theme.border}` },
    podcastControls: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    languageSelector: { padding: '0.75rem', backgroundColor: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '5px' },
    audioPlayer: { width: '100%', marginTop: '1rem' },
    showOriginalButton: { background: 'none', border: `1px solid ${theme.border}`, color: theme.text, cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', marginRight: '8px' },

    // --- Styles for Tabs and Insights Panel ---
    tabsContainer: { display: 'flex', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 },
    tabButton: {
        padding: '0.75rem 1.5rem',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: theme.text,
        opacity: 0.7,
        borderBottom: '3px solid transparent'
    },
    activeTab: {
        opacity: 1,
        borderBottom: `3px solid ${theme.primary}`,
        fontWeight: 'bold'
    },
    insightsPanel: {
        overflowY: 'auto',
        maxHeight: '45%',
        padding: '0.5rem',
        borderBottom: `1px solid ${theme.border}`,
        flexShrink: 0
    },
    selectionInsightsContainer: {
        padding: '0.5rem',
        backgroundColor: theme.background,
        borderRadius: '8px',
        animation: 'fadeIn 0.5s forwards'
    },
    chatBox: { flexGrow: 1, overflowY: 'auto', padding: '0.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: `1px solid ${theme.border}`, borderRadius: '8px', backgroundColor: theme.background },
});


const AppWrapper = () => (
    <ThemeContextProvider>
        <App />
    </ThemeContextProvider>
);

export default AppWrapper;
