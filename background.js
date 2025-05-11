function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

function removeCachedAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      if (chrome.runtime.lastError) {
        console.warn("Error or no token when trying to get current token for removal:", chrome.runtime.lastError.message);
        resolve(false); 
        return;
      }
      if (currentToken) {
        chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log("Cached auth token removed successfully.");
            resolve(true); 
          }
        });
      } else {
        console.log("No cached auth token to remove.");
        resolve(false); 
      }
    });
  });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizeTranscript") {
    const transcript = request.transcript;
    console.log("Background script received transcript for summarization:", transcript.substring(0, 100) + '...');

    getAuthToken(true) 
      .then(token => {
        if (!token) {
          throw new Error("Failed to get authentication token. User might have denied access.");
        }
        return callGeminiAPI(transcript, token);
      })
      .then(summary => {
        sendResponse({ status: "success", summary: summary });
      })
      .catch(error => {
        console.error("Error during summarization flow:", error);
        sendResponse({ status: "error", message: error.message });
      });
    return true; 
  } else if (request.action === "getUserInfo") {
    getAuthToken(false) 
      .then(token => {
        if (token) {
          return fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } else {
          throw new Error("Not authenticated.");
        }
      })
      .then(response => response.json())
      .then(userInfo => {
        if (userInfo && userInfo.email) {
          sendResponse({ status: "success", email: userInfo.email });
        } else {
          throw new Error("Failed to fetch user info or email not present.");
        }
      })
      .catch(error => {
        console.warn("Error getting user info:", error.message);
        sendResponse({ status: "error", message: error.message });
      });
    return true; 
  } else if (request.action === "logoutUser") {
    removeCachedAuthToken()
      .then(removed => {
        chrome.storage.local.remove(['userEmail'], () => {
            console.log("User info cleared from local storage.");
        });
        sendResponse({ status: "success", loggedOut: removed });
      })
      .catch(error => {
        console.error("Error during logout:", error);
        sendResponse({ status: "error", message: error.message });
      });
    return true;
  }
  return false; 
});

async function callGeminiAPI(transcriptText, authToken) {
  if (!authToken) {
    throw new Error("Authentication token is missing. Please ensure you are logged in.");
  }

  const MODEL_NAME = "gemini-1.5-flash-latest"; // or "gemini-pro"
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

  const detailedPrompt = `Please summarize the provided text with the following criteria:

1. Provide a detailed, thorough, and concise summary.
2. Summary must have a title.
3. Focus on capturing the main ideas and essential information, especially key financial insights.
4. Eliminate unnecessary details and emphasize critical points.
5. Strictly use the provided text without incorporating any external information.
6. Format the output using markdown, with bold for key points or topics that require special attention.
7. The summary should be in the language of the text I gave you.

Transcript:
${transcriptText}`;

  try {
    const response = await fetch(API_URL, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}` 
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: detailedPrompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error Response:", errorData);
      if (response.status === 401 || response.status === 403) {
        await removeCachedAuthToken();
        throw new Error(`API Authentication Error: ${response.status} ${response.statusText}. Token might be invalid or expired. Please try again. Details: ${JSON.stringify(errorData)}`);
      }
      throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
    return summary;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error.message.includes("Authentication Error")) {
        console.log("Suggesting re-authentication due to API auth error.");
    }
    throw error;
  }
}
