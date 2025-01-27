document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
    let userInput = document.getElementById('user-input').value;
    if (userInput.trim() === "") return;

    // Display user's message
    displayMessage(userInput, 'user');

    // Clear the input field
    document.getElementById('user-input').value = "";

    // Display "Thinking..." message while waiting for the response
    const thinkingMessage = displayMessage("Thinking...", 'bot');
    thinkingMessage.id = "thinking-message"; // Add an ID to target it later

    // Make the API call to get the bot response
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userInput: userInput })
    })
    .then(response => response.json())
    .then(data => {
        // Display the bot's response
        displayMessage(data.botResponse, 'bot');

        // Remove "Thinking..." message after response
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

    // Scroll to the bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    return messageDiv; // Return the message div to target it later
}
