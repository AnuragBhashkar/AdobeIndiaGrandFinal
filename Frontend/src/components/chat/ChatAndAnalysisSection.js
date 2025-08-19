import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getPdfChatStyles } from '../../styles/appStyles';
import AnimatedBotMessage from './AnimatedBotMessage';
import apiClient from '../../api/apiClient';
import { BsLightbulb } from "react-icons/bs";

const ChatAndAnalysisSection = ({
    messages, onSendMessage, loading, analysisResult, onInsightClick,
    translatedInsights, setTranslatedInsights, sessionId,
    selectionInsights, isSelectionLoading, activeTab, setActiveTab,
    userToken
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
        const response = await apiClient.post('/translate-insights/', { sessionId });
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
        const response = await apiClient.post('/generate-podcast/', {
            analysis_data: analysisResult,
            language: podcastLanguage
        }, { 
            responseType: 'blob',
        });

        const url = URL.createObjectURL(response.data);
        setAudioUrl(url);

    } catch (err) {
        console.error("Error generating podcast:", err);
    } finally {
        setIsPodcastLoading(false);
    }
  };

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

        <div className="insights-panel" style={styles.insightsPanel}>
            {activeTab === 'analysis' && analysisResult && (
                <div style={styles.analysisResult}>
                    <h4 style={{marginBottom: "0rem", marginTop: "0.2rem"}}>Initial Insights:</h4>
                      {analysisResult.top_sections?.slice(0, 5).map((section, idx) => (
                          <div key={idx} style={styles.analysisSnippet} onClick={() => onInsightClick(section)}>
                              <p style={styles.analysisReason}><strong>From {section.document}:</strong> {section.reasoning}</p>
                              <p style={styles.sectionTitleText}>Section: "{section.section_title}"</p>
                              <p>{section.subsection_analysis}</p>
                              <div style={styles.snippetFooter}>
                                  <small>Page: {section.page_number > 0 ? section.page_number : 'N/A'}</small>
                              </div>
                          </div>
                      ))}

                    {analysisResult.llm_insights && (
                        <div style={styles.llmInsightsContainer}>
                            <div style={styles.insightsHeader}>
                                <h4 style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0rem", fontSize: "1.1rem", fontWeight: "600" }}>
                                Insights Bulb 💡
                                </h4>
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

        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div ref={chatBoxRef} style={{ ...styles.chatBox, flex: 1, overflowY: "auto" }}>
            {/* chat messages here */}
        </div>
        <div style={{ ...styles.chatInputContainer, flexShrink: 0 }}>
            <input
            type="text"
            placeholder="Ask a follow-up..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={styles.input}
            disabled={!analysisResult || loading}
            />
            <button onClick={handleSend} style={styles.button} disabled={!analysisResult || loading}>
            Send
            </button>
        </div>
        </div>

    </>
  );
};

export default ChatAndAnalysisSection;