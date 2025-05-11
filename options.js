const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const userInfoDiv = document.getElementById('userInfo');
const authStatusSpan = document.getElementById('authStatus');
const userEmailSpan = document.getElementById('userEmail');
const statusDiv = document.getElementById('status');

function checkAuthStatus() {
    statusDiv.textContent = ''; 
    chrome.runtime.sendMessage({ action: "getUserInfo" }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn("Error checking auth status:", chrome.runtime.lastError.message);
            updateUI(false); 
            authStatusSpan.textContent = "Error checking status.";
            return;
        }

        if (response && response.status === "success" && response.email) {
            updateUI(true, response.email);
        } else {
            updateUI(false);
            if (response && response.message && response.message.includes("Not authenticated")) {
                 authStatusSpan.textContent = "Not logged in.";
            } else if (response && response.message) {
                authStatusSpan.textContent = `Error: ${response.message}`;
            } else {
                authStatusSpan.textContent = "Could not retrieve user info.";
            }
        }
    });
}

function updateUI(isLoggedIn, email = 'N/A') {
    userInfoDiv.classList.remove('hidden');
    if (isLoggedIn) {
        authStatusSpan.textContent = "Logged In";
        userEmailSpan.textContent = email;
        loginButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        userInfoDiv.classList.add('logged-in');
        userInfoDiv.classList.remove('logged-out');
    } else {
        authStatusSpan.textContent = authStatusSpan.textContent === "Checking..." ? "Not Logged In" : authStatusSpan.textContent; 
        userEmailSpan.textContent = 'N/A';
        loginButton.classList.remove('hidden');
        logoutButton.classList.add('hidden');
        userInfoDiv.classList.add('logged-out');
        userInfoDiv.classList.remove('logged-in');
    }
}

loginButton.addEventListener('click', () => {
    statusDiv.textContent = 'Attempting to login... Please follow any prompts.';
    
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
            console.error("Login failed:", chrome.runtime.lastError ? chrome.runtime.lastError.message : "No token received.");
            statusDiv.textContent = `Login failed: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : "Could not get token."}`;
            updateUI(false);
        } else {
            console.log("Login successful, token obtained.");
            statusDiv.textContent = 'Login successful! Checking user info...';
            checkAuthStatus();
        }
    });
});

logoutButton.addEventListener('click', () => {
    statusDiv.textContent = 'Logging out...';
    chrome.runtime.sendMessage({ action: "logoutUser" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Logout failed:", chrome.runtime.lastError.message);
            statusDiv.textContent = `Logout failed: ${chrome.runtime.lastError.message}`;
            checkAuthStatus(); 
            return;
        }
        if (response && response.status === "success") {
            statusDiv.textContent = 'Successfully logged out.';
            console.log("Logout message processed successfully.");
        } else {
            statusDiv.textContent = `Logout may not have fully completed: ${response ? response.message : 'Unknown issue'}`;
            console.warn("Logout response not entirely successful:", response);
        }
        updateUI(false); 
    });
});

document.addEventListener('DOMContentLoaded', checkAuthStatus);
