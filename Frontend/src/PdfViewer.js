// src/PdfViewer.js

import React, { useEffect, useRef } from 'react';
import { useAdobeSdk } from './useAdobeSdk';

const PdfViewer = ({ filePromise, fileName, pageNumber, onTextSelect }) => {
  const viewerRef = useRef(null);
  const isSdkReady = useAdobeSdk();
  const apisRef = useRef(null);

  useEffect(() => {
    if (isSdkReady && filePromise && viewerRef.current) {
      const clientId = process.env.REACT_APP_ADOBE_CLIENT_ID;
      if (!clientId) {
        console.error("Adobe Client ID is missing.");
        return;
      }

      apisRef.current = null;
      viewerRef.current.innerHTML = "";

      const adobeDCView = new window.AdobeDC.View({
        clientId: clientId,
        divId: viewerRef.current.id,
      });

      const previewFilePromise = adobeDCView.previewFile(
        {
          content: { promise: filePromise },
          metaData: { fileName: fileName },
        },
        { embedMode: 'SIZED_CONTAINER' }
      );

      previewFilePromise.then(adobeViewer => {
        adobeViewer.getAPIs().then(apis => {
          apisRef.current = apis;
          apis.gotoLocation(pageNumber);
        });
      });
    }
  }, [isSdkReady, filePromise, fileName]);

  useEffect(() => {
    if (apisRef.current) {
      apisRef.current.gotoLocation(pageNumber)
        .then(() => console.log(`Successfully navigated to page ${pageNumber}.`))
        .catch(error => console.error("Error navigating to page:", error));
    }
  }, [pageNumber]);

  const handleGetSelectedText = () => {
    if (apisRef.current) {
        apisRef.current.getSelectedContent()
            .then(result => {
                if (result && result.type === 'text' && result.data) {
                    onTextSelect(result.data);
                } else {
                    alert('No text selected. Please select some text in the PDF to get insights.');
                }
            })
            .catch(error => console.error("Error getting selected content:", error));
    }
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div id="adobe-dc-view" ref={viewerRef} style={{ height: '100%' }} />
      <button
        onClick={handleGetSelectedText}
        style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            padding: '10px 15px',
            backgroundColor: '#e50914',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        Get Insights on Selection
      </button>
    </div>
  );
};

export default PdfViewer;