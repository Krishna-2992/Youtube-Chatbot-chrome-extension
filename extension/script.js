// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const videoInfo = document.getElementById('videoInfo');
const videoTitle = document.getElementById('videoTitle');

// State
let currentVideoId = null;
let currentUrl = null;
let videoProcessed = false;

// Function to get current tab URL
async function getCurrentTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    } catch (error) {
        console.error('Error getting current tab:', error);
        return null;
    }
}

// Function to extract YouTube video ID from URL
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Function to get video title from YouTube
function getVideoTitle(tab) {
    if (tab && tab.title) {
        return tab.title.replace(' - YouTube', '').trim();
    }
    return 'Unknown Video';
}

// Function to add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${isUser ? 
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>` :
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>`
            }
        </div>
        <div class="message-content">
            <div class="message-text">${text}</div>
            <div class="message-time">${currentTime}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to show typing indicator
function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to hide typing indicator
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

async function processVideo(videoId) {
    return true;
}

async function getAIResponse(message) {
    try {
        const response = await fetch(`http://localhost:8000/getRetrievedDocs?video_id=${currentVideoId}&question=${encodeURIComponent(message)}`);
        const data = await response.json();
        return data.retrieved_docs;
    } catch (error) {
        console.error('Error getting AI response:', error);
        return "I'm having trouble connecting to my AI backend.";
    }
}

// Function to handle sending messages
async function sendMessage(text) {
    if (!text.trim()) return;
    
    // Add user message
    addMessage(text, true);
    
    // Clear input
    messageInput.value = '';
    sendButton.disabled = true;
    
    // Check if we have a video to work with
    if (!currentVideoId) {
        addMessage("Please navigate to a YouTube video first so I can help you with it!", false);
        sendButton.disabled = false;
        return;
    }
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Process video if not already processed
        if (!videoProcessed) {
            const processed = await processVideo(currentVideoId);
            if (!processed) {
                hideTypingIndicator();
                sendButton.disabled = false;
                return;
            }
        }
        
        // Get AI response
        const response = await getAIResponse(text);
        
        // Hide typing indicator and show response
        hideTypingIndicator();
        addMessage(response, false);
        
    } catch (error) {
        hideTypingIndicator();
        addMessage("Sorry, I encountered an error while processing your request. Please try again.", false);
        console.error('Error in sendMessage:', error);
    }
    
    sendButton.disabled = false;
}

// Function to initialize the extension
async function initializeExtension() {
    try {
        // Get current tab info
        const tab = await getCurrentTabUrl();
        
        if (tab) {
            currentUrl = tab.url;
            currentVideoId = extractVideoId(currentUrl);
            
            // Update video info in header
            if (currentVideoId) {
                const title = getVideoTitle(tab);
                videoTitle.textContent = title;
                videoInfo.style.display = 'flex';
                
                console.log('YouTube Video ID:', currentVideoId);
                console.log('Video Title:', title);
                
                // Add a message about the video being detected
                setTimeout(() => {
                    addMessage(`I've detected you're watching: "${title}". I'm ready to answer questions about this video!`, false);
                }, 500);
                
            } else {
                videoTitle.textContent = 'Not a YouTube video';
                videoInfo.style.display = 'flex';
                
                // Add message for non-YouTube pages
                setTimeout(() => {
                    addMessage("Please navigate to a YouTube video so I can help you understand its content!", false);
                }, 500);
            }
        }
        
        // Test backend connection
        try {
            const response = await fetch("http://localhost:8000/health");
            const data = await response.json();
            console.log('Backend health check:', data);
        } catch (error) {
            console.error('Backend not available:', error);
            setTimeout(() => {
                addMessage("⚠️ My AI backend seems to be offline. Please make sure it's running on localhost:8000", false);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error initializing extension:', error);
        videoTitle.textContent = 'Error loading video info';
    }
}

// Event Listeners
sendButton.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text) {
        sendMessage(text);
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text) {
            sendMessage(text);
        }
    }
});

messageInput.addEventListener('input', () => {
    sendButton.disabled = !messageInput.value.trim();
});

// Quick action buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-button')) {
        const message = e.target.getAttribute('data-message');
        if (message) {
            messageInput.value = message;
            sendMessage(message);
        }
    }
});

// Initialize when popup opens
initializeExtension();