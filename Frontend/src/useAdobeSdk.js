import { useState, useEffect } from 'react';

// The official URL for the Adobe View SDK
const ADOBE_SDK_URL = 'https://documentservices.adobe.com/view-sdk/main.js';

// A variable outside the component to ensure the script is loaded only once per session.
let adobeSdkPromise = null;

/**
 * A custom React hook to manage the loading of the Adobe PDF Embed SDK.
 * This ensures the script is loaded only once.
 * @returns {boolean} A boolean indicating if the SDK is ready to be used.
 */
export const useAdobeSdk = () => {
  const [isSdkReady, setIsSdkReady] = useState(false);

  useEffect(() => {
    // If the SDK is already on the window object, we're ready.
    if (window.AdobeDC) {
      setIsSdkReady(true);
      return;
    }

    // If the script is not already being loaded, start loading it.
    if (!adobeSdkPromise) {
      adobeSdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = ADOBE_SDK_URL;
        script.async = true;

        // The `onload` event is a reliable way to know the script is ready.
        script.onload = () => {
          // Listen for the custom event from the Adobe SDK as the source of truth.
          document.addEventListener('adobe_dc_view_sdk.ready', () => {
            resolve();
          });
        };

        script.onerror = () => {
          console.error("Failed to load the Adobe DC View SDK script.");
          reject(new Error("Adobe SDK script loading failed."));
        };

        document.body.appendChild(script);
      });
    }

    // Once the promise resolves, we know the SDK is ready.
    adobeSdkPromise.then(() => {
      setIsSdkReady(true);
    });

  }, []); // The empty dependency array `[]` ensures this effect runs only once.

  return isSdkReady;
};
