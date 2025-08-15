// src/PdfViewer.js

import React, { useEffect, useRef } from 'react';
import { useAdobeSdk } from './useAdobeSdk';

const PdfViewer = ({ filePromise, fileName, pageNumber }) => {
  const viewerRef = useRef(null);
  const isSdkReady = useAdobeSdk();
  
  // This ref will now store the resolved API object itself, not the promise.
  const apisRef = useRef(null);

  // --- HOOK 1: Handles loading a new file ---
  useEffect(() => {
    // Only run if the SDK is ready, a file is provided, and the div exists
    if (isSdkReady && filePromise && viewerRef.current) {
      const clientId = process.env.REACT_APP_ADOBE_CLIENT_ID;
      if (!clientId) {
        console.error("Adobe Client ID is missing.");
        return;
      }

      // Clear the ref when a new file is loaded to prevent using old APIs
      apisRef.current = null;
      viewerRef.current.innerHTML = ""; // Clean the div for the new viewer

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

      // After the file loads, get the APIs and store them in the ref
      previewFilePromise.then(adobeViewer => {
        adobeViewer.getAPIs().then(apis => {
          apisRef.current = apis;
          // Also navigate to the initial page number when the file first loads
          apis.gotoLocation(pageNumber);
        });
      });
    }
  }, [isSdkReady, filePromise, fileName]); // This hook only re-runs when the file changes

  // --- HOOK 2: Handles page navigation for an already loaded file ---
  useEffect(() => {
    // If the APIs have been loaded and stored in the ref, we can navigate
    if (apisRef.current) {
      apisRef.current.gotoLocation(pageNumber)
        .then(() => console.log(`Successfully navigated to page ${pageNumber}.`))
        .catch(error => console.error("Error navigating to page:", error));
    }
  }, [pageNumber]); // This hook only re-runs when the target page number changes

  return (
    <div id="adobe-dc-view" ref={viewerRef} style={{ height: '100%' }} />
  );
};

export default PdfViewer;