import React, { useEffect } from 'react';

const ADOBE_SDK_URL = 'https://documentservices.adobe.com/view-sdk/main.js';

const PdfViewer = ({ url, fileName }) => {
  useEffect(() => {
    // Load the Adobe View SDK script
    const script = document.createElement('script');
    script.src = ADOBE_SDK_URL;
    script.async = true;
    document.head.appendChild(script);

    // The adobe_dc_view_sdk.ready event is fired when the SDK is ready
    document.addEventListener('adobe_dc_view_sdk.ready', () => {
      const adobeDCView = new window.AdobeDC.View({
        // Pass your Client ID here
        clientId: process.env.REACT_APP_ADOBE_CLIENT_ID,
        // The ID of the div that will host the PDF viewer
        divId: 'adobe-dc-view',
      });

      // Call the previewFile method
      adobeDCView.previewFile(
        {
          content: { location: { url: url } },
          metaData: { fileName: fileName },
        },
        {
          embedMode: 'SIZED_CONTAINER',
        }
      );
    });
  }, [url, fileName]); // Re-run the effect if the url or fileName changes

  return (
    <div id="adobe-dc-view" style={{ height: '80vh', width: '100%' }} />
  );
};

export default PdfViewer;