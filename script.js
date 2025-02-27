document.addEventListener("DOMContentLoaded", function () {
    let latestRecipe = ""; // Store the latest recipe response

    // ✅ Restore check-login logic
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

    // ✅ Capture the response length from the slider
    const responseLengthSlider = document.getElementById("response-length");
    let responseLength = responseLengthSlider.value; // Default value

    // Update the response length value whenever the slider is changed
    responseLengthSlider.addEventListener("input", function () {
        responseLength = this.value;
    });

    // ✅ Function to send message to chatbot
    function sendMessage() {
        let userInput = document.getElementById('user-input').value.trim();
        
        if (!userInput || userInput.length === 0) {
            alert("Please enter a valid message.");
            return;
        }

        displayMessage(userInput, 'user');
        document.getElementById('user-input').value = ""; // Clear input field

        const thinkingMessage = displayMessage("Thinking...", 'bot');
        thinkingMessage.id = "thinking-message";

        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput, responseLength }),  // ✅ Send response length to server
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('thinking-message')?.remove();

            if (!data.botResponse || data.botResponse.trim() === "") {
                alert("No response received.");
                return;
            }

            displayMessage(data.botResponse, 'bot');
            latestRecipe = data.botResponse; // ✅ Correctly store the latest chatbot response
        })
        .catch(error => {
            console.error("Error:", error);
            displayMessage("Sorry, something went wrong.", 'bot');
            document.getElementById('thinking-message')?.remove();
        });
    }

    document.getElementById('send-btn').addEventListener('click', sendMessage);

    // ✅ Save Recipe Button Functionality
    document.getElementById("save-recipe-btn").addEventListener("click", function () {
        if (!latestRecipe || latestRecipe.trim() === "") {
            alert("No recipe to save.");
            return;
        }

        fetch("/save-recipe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeContent: latestRecipe }),
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Recipe saved successfully!");
            } else {
                alert("Failed to save recipe. Please log in.");
            }
        })
        .catch(error => console.error("Error saving recipe:", error));
    });
});

// ✅ Display message function
function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}


document.getElementById('send-btn').addEventListener('click', sendMessage);




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