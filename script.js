document.addEventListener("DOMContentLoaded", function () {
    fetch('/check-login')
        .then(response => response.json())
        .then(data => {
            const accountBtn = document.getElementById("account-btn");
            if (data.loggedIn) {
                accountBtn.textContent = "My Account";
                accountBtn.href = "account.html"; 
            }
        })
        .catch(error => console.error("Error checking login status:", error));
});

document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
    let userInput = document.getElementById('user-input').value.trim();
    if (!userInput) {
        alert("Please enter a message before sending.");
        return;
    }

    displayMessage(userInput, 'user');
    document.getElementById('user-input').value = "";

    const thinkingMessage = displayMessage("Thinking...", 'bot');
    thinkingMessage.id = "thinking-message";

    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
        credentials: 'include' 
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('thinking-message')?.remove();

        if (data.botResponse.includes("You need to log in") || data.botResponse.includes("Error")) {
            alert(data.botResponse); // Show error alerts for unauthorized users or chatbot issues
        } else {
            displayMessage(data.botResponse, 'bot');
        }
    })
    .catch(error => {
        console.error("Error sending message:", error);
        displayMessage("Sorry, there was an error processing your request.", 'bot');
        document.getElementById('thinking-message')?.remove();
    });
}
document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
    let userInput = document.getElementById('user-input').value;
    let responseLength = document.getElementById('response-length').value; // Get slider value

    if (userInput.trim() === "") return;

    // Display user's message
    displayMessage(userInput, 'user');

    document.getElementById('user-input').value = "";

    // Show "Thinking..." while waiting for response
    const thinkingMessage = displayMessage("Thinking...", 'bot');
    thinkingMessage.id = "thinking-message";

    // Send message to backend with response length preference
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userInput: userInput, responseLength: responseLength }) // Include response length
    })
    .then(response => response.json())
    .then(data => {
        displayMessage(data.botResponse, 'bot');
        document.getElementById('thinking-message')?.remove();
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("Sorry, there was an error processing your request.", 'bot');
        document.getElementById('thinking-message')?.remove();
    });
}

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}


function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatBox.appendChild(messageDiv);

    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}
