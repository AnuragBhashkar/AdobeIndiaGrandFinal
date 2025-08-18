import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getPdfChatStyles } from '../styles/appStyles';
import SessionHistorySidebar from '../components/chat/SessionHistorySidebar';
import ChatAndAnalysisSection from '../components/chat/ChatAndAnalysisSection';
import PdfViewer from '../PdfViewer';
import apiClient from '../api/apiClient';

const PdfChatPage = ({ userToken }) => {
    const { currentTheme } = useTheme();
    const styles = getPdfChatStyles(currentTheme);

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

    const [selectionInsights, setSelectionInsights] = useState(null);
    const [isSelectionLoading, setIsSelectionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('analysis');

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
        setAnalysisResult(null);

        const formData = new FormData();
        formData.append('persona', persona);
        formData.append('job_to_be_done', job);
        pdfs.forEach(pdfFile => formData.append('files', pdfFile));
        
        if (sessionId) {
            formData.append('sessionId', sessionId);
        }

        try {
            const response = await apiClient.post('/analyze/', formData, {
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
            const response = await apiClient.post('/chat/', {
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
            const response = await apiClient.get(`/sessions/${selectedSessionId}`);
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
                    const fileResponse = await apiClient.get(path, {
                        responseType: 'blob',
                    });
                    return new File([fileResponse.data], fileName, { type: 'application/pdf' });
                });
                const loadedPdfs = await Promise.all(filePromises);
                setPdfs(loadedPdfs);

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
        setSelectionInsights(null);
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

    const handleTextSelect = async (selectedText) => {
        if (!selectedText || isSelectionLoading) return;
        setIsSelectionLoading(true);
        setSelectionInsights(null);
        setActiveTab('selection');

        try {
            const response = await apiClient.post('/insights-on-selection', {
                text: selectedText,
            });
            setSelectionInsights(response.data);
        } catch (err) {
            console.error("Failed to get insights on selection:", err);
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
                userToken={userToken}
            />
            <div style={styles.mainContent}>
                <div style={styles.viewerPanel}>
                    {filePromise && selectedPDF ? (
                        <PdfViewer
                            filePromise={filePromise}
                            fileName={selectedPDF.name}
                            pageNumber={targetPage}
                            onTextSelect={handleTextSelect}
                        />
                    ) : (
                        <div style={styles.viewerPlaceholder}>
                            <p>{sessionId ? "Select a PDF from the analysis to view it." : "Upload and select a PDF to view it here."}</p>
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
                            userToken={userToken}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PdfChatPage;