import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import axios from 'axios';

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


// ------------------ Login/Signup Modal Component ------------------
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

// ------------------ Home Page Component ------------------
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

// ------------------ About Us Page Component ------------------
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

// ------------------ Shared Components (Navbar & Footer) ------------------
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
const PdfManagerNavbar = ({ pdfs, onSelectPDF, selectedPDF, onFileChange }) => {
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);
    return (
        <div style={styles.pdfManagerNavbar}>
            <div style={styles.uploadContainer}>
                <label htmlFor="file-upload" style={styles.uploadButton}>Upload PDFs</label>
                <input id="file-upload" type="file" accept="application/pdf" multiple onChange={onFileChange} style={{ display: 'none' }}/>
            </div>
            <div style={styles.pdfList}>
                {pdfs.map((pdf) => (
                    <button key={pdf.name} onClick={() => onSelectPDF(pdf)} style={{...styles.pdfListItem, ...(selectedPDF?.name === pdf.name && styles.activePdfListItem)}}>
                        {pdf.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const PdfChatPage = () => {
  const { currentTheme } = useTheme();
  const styles = getPdfChatStyles(currentTheme);
  
  const [pdfs, setPdfs] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const [persona, setPersona] = useState('');
  const [job, setJob] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([]);
  const [viewerUrl, setViewerUrl] = useState('');

  useEffect(() => {
    return () => {
        if (viewerUrl) {
            URL.revokeObjectURL(viewerUrl);
        }
    };
  }, [viewerUrl]);


  const handlePDFSelect = (pdf) => {
    if (selectedPDF?.name !== pdf.name) {
        setSelectedPDF(pdf);
        setMessages([]);
        setZoomLevel(1);
        setViewerUrl(URL.createObjectURL(pdf) + '#page=1');
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
    setAnalysisResult(null);
    setMessages([]);

    const formData = new FormData();
    formData.append('persona', persona);
    formData.append('job_to_be_done', job);

    pdfs.forEach(pdfFile => {
        formData.append('files', pdfFile);
    });

    try {
        const response = await axios.post('http://localhost:8000/analyze/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        setAnalysisResult(response.data);
        setMessages([{ role: 'bot', content: 'Analysis complete! Here are the key insights. You can ask follow-up questions now.' }]);

    } catch (err) {
        const errorMessage = err.response?.data?.detail || 'An unexpected error occurred during analysis.';
        setError(errorMessage);
        setMessages([{ role: 'bot', content: `Error: ${errorMessage}` }]);
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoomLevel(prev => Math.min(3, prev + 0.1));
    else setZoomLevel(prev => Math.max(0.2, prev - 0.1));
  };
  
  const handleSendQuery = async (msg) => {
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', content: `This is a mocked response for your follow-up: "${msg}"` }]);
        setLoading(false);
    }, 1000);
  };

  const handleInsightClick = (insight) => {
      const pdfFile = pdfs.find(p => p.name === insight.document);
      if (pdfFile) {
          setSelectedPDF(pdfFile);
          setViewerUrl(URL.createObjectURL(pdfFile) + '#page=' + (insight.page_number + 1));
      }
  };

  return (
    <div style={styles.appContainer}>
      <PdfManagerNavbar 
          pdfs={pdfs} 
          onSelectPDF={handlePDFSelect} 
          selectedPDF={selectedPDF}
          onFileChange={handleFileChange}
      />
      <div style={styles.mainContent}>
        <div style={styles.viewerPanel}>
            <div style={styles.zoomHint}>Use mouse wheel to zoom | {Math.round(zoomLevel * 100)}%</div>
            <PDFViewer url={viewerUrl} zoomLevel={zoomLevel} onWheelZoom={handleWheelZoom}/>
        </div>
        <ChatAndAnalysisSection
            messages={messages}
            onSendMessage={handleSendQuery}
            loading={loading}
            persona={persona}
            setPersona={setPersona}
            job={job}
            setJob={setJob}
            onStartAnalysis={handleStartAnalysis}
            analysisResult={analysisResult}
            error={error}
            onInsightClick={handleInsightClick}
        />
      </div>
    </div>
  );
};

const PDFViewer = ({ url, zoomLevel, onWheelZoom }) => {
  const { currentTheme } = useTheme();
  const styles = getPdfChatStyles(currentTheme);
  if (!url) return <div style={styles.viewerPlaceholder}><p>Select a PDF to view it here.</p></div>;
  return <div style={styles.viewer} onWheel={onWheelZoom}><iframe key={url} title="PDF Preview" src={url} style={{width: '100%', height: '100%', border: 'none', transform: `scale(${zoomLevel})`, transformOrigin: 'top center'}}/></div>;
};

const StructuredTextViewer = ({ text }) => {
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

    const lines = text.split('\n').filter(line => line.trim() !== '');

    return (
        <div style={styles.analysisTextContainer}>
            {lines.map((line, index) => {
                const isListItem = /^\s*[\u2022*-]/.test(line);
                if (isListItem) {
                    return (
                        <div key={index} style={styles.structuredListItem}>
                           <span style={styles.bulletPoint}>•</span>
                           <span>{line.replace(/^\s*[\u2022*-]\s*/, '').trim()}</span>
                        </div>
                    );
                }
                const isSubheading = line.length < 60 && !line.endsWith('.') && !line.endsWith(':');
                if (isSubheading) {
                     return <p key={index} style={styles.structuredSubheading}>{line.trim()}</p>
                }
                return <p key={index} style={styles.structuredParagraph}>{line.trim()}</p>;
            })}
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

const ChatAndAnalysisSection = ({ messages, onSendMessage, loading, persona, setPersona, job, setJob, onStartAnalysis, analysisResult, error, onInsightClick }) => {
  const { currentTheme } = useTheme();
  const styles = getPdfChatStyles(currentTheme);
  const [input, setInput] = useState('');
  const chatBoxRef = useRef(null);
  
  const [revealedInsights, setRevealedInsights] = useState([]);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (analysisResult?.subsection_analysis) {
        setRevealedInsights([]);
        setAudioUrl(null);
        const insights = analysisResult.subsection_analysis;
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < insights.length) {
                setRevealedInsights(prev => [...prev, insights[i]]);
                i++;
            } else {
                clearInterval(intervalId);
            }
        }, 300);

        return () => clearInterval(intervalId);
    }
  }, [analysisResult]);
  
  useEffect(() => { 
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; 
  }, [messages, revealedInsights, loading, audioUrl]);

  const handleSend = () => { if (!input.trim()) return; onSendMessage(input); setInput(''); };

  const groupedInsights = revealedInsights.reduce((acc, insight) => {
    if (!insight) return acc;
    const docName = insight.document;
    if (!acc[docName]) {
        acc[docName] = [];
    }
    acc[docName].push(insight);
    return acc;
  }, {});

  const handleGeneratePodcast = async () => {
      if (!analysisResult) return;
      setIsPodcastLoading(true);
      setAudioUrl(null);

      try {
          const response = await axios.post('http://localhost:8000/generate-podcast/', {
              analysis_data: analysisResult
          }, {
              responseType: 'blob'
          });

          const url = URL.createObjectURL(response.data);
          setAudioUrl(url);

      } catch (err) {
          console.error("Error generating podcast:", err);
      } finally {
          setIsPodcastLoading(false);
      }
  };

  return (
    <div style={styles.chatPanel}>
        <h3 style={styles.sidebarTitle}>Analysis & Chat</h3>
        
        <div style={styles.chatControls}>
            <input type="text" placeholder="Persona (e.g., 'a legal expert')" value={persona} onChange={(e) => setPersona(e.target.value)} style={styles.input}/>
            <textarea placeholder="Job to be done (e.g., 'summarize key risks')" value={job} onChange={(e) => setJob(e.target.value)} style={{...styles.input, ...styles.textarea}}/>
            <button onClick={onStartAnalysis} style={styles.button} disabled={loading}>
                {loading ? 'Analyzing...' : 'Start Analysis'}
            </button>
            {error && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
        </div>

        <div ref={chatBoxRef} style={styles.chatBox}>
            {!analysisResult && messages.length === 0 && !loading && <div style={styles.placeholderText}>Analysis results will appear here.</div>}
            
            {loading && !analysisResult && <div style={styles.loadingIndicator}>Analyzing documents, please wait...</div>}

            {analysisResult && (
                <div style={styles.analysisResult}>
                    <h4>Initial Insights:</h4>
                    {groupedInsights && Object.entries(groupedInsights).map(([docName, insights]) => (
                        <div key={docName} style={styles.insightGroup}>
                            <h5 style={styles.insightDocTitle}>{docName}</h5>
                            {insights.map((sub, idx) => (
                                <div key={idx} style={styles.analysisSnippet} onClick={() => onInsightClick(sub)}>
                                    <p style={styles.analysisReason}>
                                        <strong>Why this was chosen:</strong> {sub.reason}
                                    </p>
                                    <StructuredTextViewer text={sub.refined_text} />
                                    <small>
                                        (From Page: {sub.page_number + 1})
                                    </small>
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    {analysisResult.llm_insights && (
                        <div style={styles.llmInsightsContainer}>
                            <h4>Enhanced Insights from Gemini:</h4>
                            
                            {analysisResult.llm_insights.key_insights?.length > 0 && (
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Key Insights</h6>
                                    <ul>
                                        {analysisResult.llm_insights.key_insights.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            {analysisResult.llm_insights.did_you_know?.length > 0 && (
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Did You Know?</h6>
                                    <ul>
                                        {analysisResult.llm_insights.did_you_know.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            {analysisResult.llm_insights.cross_document_connections?.length > 0 && (
                                <div style={styles.insightCategory}>
                                    <h6 style={styles.insightCategoryTitle}>Connections Across Documents</h6>
                                    <ul>
                                        {analysisResult.llm_insights.cross_document_connections.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={styles.podcastContainer}>
                        <button onClick={handleGeneratePodcast} style={styles.button} disabled={isPodcastLoading || loading}>
                            {isPodcastLoading ? 'Generating Audio...' : '🎧 Generate Podcast Summary'}
                        </button>
                        {audioUrl && (
                            <audio controls src={audioUrl} style={styles.audioPlayer}>
                                Your browser does not support the audio element.
                            </audio>
                        )}
                    </div>
                </div>
            )}

            {messages.map((msg, idx) => (
                msg.role === 'user' ? (
                    <div key={idx} style={{...styles.chatMessage, ...styles.userMessage}}>
                        {msg.content}
                    </div>
                ) : (
                    <AnimatedBotMessage key={idx} message={msg} />
                )
            ))}

            {loading && analysisResult && <div style={styles.loadingIndicator}>Thinking...</div>}
        </div>
        
        <div style={styles.chatInputContainer}>
            <input type="text" placeholder="Ask a follow-up..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} style={styles.input} disabled={!analysisResult || loading}/>
            <button onClick={handleSend} style={styles.button} disabled={!analysisResult || loading}>Send</button>
        </div>
    </div>
  );
};


// ------------------ Theme and Styles Definitions ------------------
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

// ------------------ Main App Router ------------------
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
              @keyframes blink {
                  50% { opacity: 0; }
              }
              .typingCursor {
                  animation: blink 1s step-end infinite;
              }
              @keyframes fadeIn {
                  from { 
                      opacity: 0;
                      transform: translateY(10px);
                  }
                  to { 
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
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

// ------------------ Styles Functions ------------------
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
    appContainer: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 49px)', backgroundColor: theme.background, color: theme.text, fontFamily: "'Segoe UI', Roboto, sans-serif" },
    pdfManagerNavbar: { display: 'flex', alignItems: 'center', padding: '0.25rem 1rem', backgroundColor: theme.secondary, borderBottom: `1px solid ${theme.border}`, gap: '1rem' },
    uploadContainer: {},
    uploadButton: { padding: '0.4rem 0.8rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    pdfList: { display: 'flex', gap: '0.5rem', overflowX: 'auto', flexGrow: 1 },
    pdfListItem: { padding: '0.4rem 0.8rem', borderRadius: '5px', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.text },
    activePdfListItem: { backgroundColor: theme.activeItem, color: theme.activeItemText, fontWeight: 'bold', borderColor: theme.primary },
    mainContent: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
    viewerPanel: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.background, position: 'relative', borderRight: `1px solid ${theme.border}` },
    zoomHint: { position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', zIndex: 10, pointerEvents: 'none', userSelect: 'none' },
    viewer: { flexGrow: 1, display: 'flex', justifyContent: 'center', backgroundColor: theme.secondary, overflow: 'auto', margin: '1rem', marginTop: '3rem' },
    viewerPlaceholder: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem', textAlign: 'center', color: theme.text, opacity: 0.7 },
    chatPanel: { flex: 1.5, backgroundColor: theme.secondary, padding: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    sidebarTitle: { margin: '0 0 1rem 0', color: theme.header, borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem' },
    chatControls: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
    chatBox: { flexGrow: 1, overflowY: 'auto', padding: '0.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    chatInputContainer: { display: 'flex', gap: '0.5rem', marginTop: 'auto' },
    input: { flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '5px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, width: 'calc(100% - 1.5rem)' },
    textarea: { minHeight: '60px', resize: 'vertical', fontFamily: "'Segoe UI', Roboto, sans-serif" },
    button: { padding: '0.75rem 1.5rem', backgroundColor: theme.primary, color: theme.buttonText, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    chatMessage: { padding: '0.75rem 1rem', borderRadius: '12px', maxWidth: '85%', lineHeight: '1.4' },
    userMessage: { backgroundColor: theme.messageBgUser, color: theme.messageTextUser, alignSelf: 'flex-end', borderBottomRightRadius: '2px' },
    botMessage: { backgroundColor: theme.messageBgBot, color: theme.messageTextBot, alignSelf: 'flex-start', borderBottomLeftRadius: '2px' },
    loadingIndicator: { alignSelf: 'center', color: theme.text, opacity: 0.8, fontStyle: 'italic', padding: '1rem' },
    placeholderText: { textAlign: 'center', opacity: 0.7, margin: 'auto' },
    analysisResult: { padding: '0.5rem', backgroundColor: theme.background, borderRadius: '8px', marginBottom: '1rem' },
    insightGroup: { marginBottom: '1rem', padding: '1rem', backgroundColor: theme.secondary, borderRadius: '8px', border: `1px solid ${theme.border}` },
    insightDocTitle: { margin: '0 0 1rem 0', color: theme.header, borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem', fontSize: '1.1rem' },
    analysisSnippet: { borderLeft: `3px solid ${theme.primary}`, padding: '10px', margin: '10px 0', backgroundColor: theme.inputBg, borderRadius: '4px', cursor: 'pointer', opacity: 0, animation: 'fadeIn 0.5s forwards' },
    analysisReason: { fontStyle: 'italic', opacity: 0.9, marginBottom: '8px', fontSize: '0.9rem' },
    analysisTextContainer: { margin: '0 0 5px 0' },
    structuredListItem: { display: 'flex', alignItems: 'flex-start', marginBottom: '4px', lineHeight: '1.5' },
    bulletPoint: { marginRight: '8px', color: theme.primary, lineHeight: '1.5' },
    structuredSubheading: { fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' },
    structuredParagraph: { margin: '0 0 8px 0', lineHeight: '1.5' },
    typingCursor: { animation: 'blink 1s step-end infinite', marginLeft: '2px' },
    llmInsightsContainer: { marginTop: '1.5rem', padding: '1rem', backgroundColor: theme.secondary, borderRadius: '8px', border: `1px solid ${theme.border}` },
    insightCategory: { marginBottom: '1rem' },
    insightCategoryTitle: { margin: '0 0 0.5rem 0', color: theme.header, fontWeight: 'bold', fontSize: '1.1rem' },
    podcastContainer: { marginTop: '1.5rem', padding: '1rem', backgroundColor: theme.secondary, borderRadius: '8px', border: `1px solid ${theme.border}` },
    audioPlayer: { width: '100%', marginTop: '1rem' },
});

const AppWrapper = () => (
    <ThemeContextProvider>
        <App />
    </ThemeContextProvider>
);

export default AppWrapper;
