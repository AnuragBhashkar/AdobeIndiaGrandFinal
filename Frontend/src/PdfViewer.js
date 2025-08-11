import React, { useEffect, useRef } from 'react';
import { useAdobeSdk } from './useAdobeSdk'; // Import the new custom hook

const PdfViewer = ({ filePromise, fileName }) => {
  const viewerRef = useRef(null);
  const isSdkReady = useAdobeSdk(); // Use the hook to know when the SDK is ready

  useEffect(() => {
    // Do not attempt to render if the SDK isn't ready, if there's no file promise,
    // or if the viewer div isn't available yet.
    if (!isSdkReady || !filePromise || !viewerRef.current) {
      return;
    }

    // Ensure the Client ID is available before initializing the viewer
    const clientId = process.env.REACT_APP_ADOBE_CLIENT_ID;
    if (!clientId) {
        console.error("Adobe Client ID is missing. Check your .env file and restart the server.");
        return;
    }

    const adobeDCView = new window.AdobeDC.View({
      clientId: clientId,
      divId: viewerRef.current.id,
    });

    // previewFile can accept a promise that resolves with the file content
    adobeDCView.previewFile(
      {
        // Pass the promise directly to the content property
        content: { promise: filePromise },
        metaData: { fileName: fileName },
      },
      {
        embedMode: 'SIZED_CONTAINER',
        showAnnotationTools: true,
      }
    ).catch(error => {
      console.error("Adobe PDF Viewer could not render the file. This is likely a domain configuration issue in your Adobe Developer Console.", error);
    });

  }, [isSdkReady, filePromise, fileName]);

  // Use a key to help React re-mount the component when the file changes
  return (
    <div key={fileName} ref={viewerRef} id={`adobe-dc-view-${fileName}`} style={{ height: '100%', width: '100%' }} />
  );
};

export default PdfViewer;
