document.addEventListener("DOMContentLoaded", function () {
    // ✅ Check login status on page load
    fetch('/check-login')
        .then(response => response.json())
        .then(data => {
            const accountBtn = document.getElementById("account-btn");
            if (data.loggedIn) {
                accountBtn.textContent = "My Account";
                accountBtn.href = "account.html"; 
            } else {
                accountBtn.textContent = "Sign In";
                accountBtn.href = "signin.html"; 
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

    // ✅ Store latest recipe for saving
    let latestRecipe = "";

    // ✅ Function to send message to chatbot
    function sendMessage() {
        let userInput = document.getElementById('user-input').value.trim();
        
        if (!userInput) {
            alert("Please enter a valid message.");
            return;
        }

        displayMessage(userInput, 'user');
        document.getElementById('user-input').value = "";

        const thinkingMessage = displayMessage("Thinking...", 'bot');
        thinkingMessage.id = "thinking-message";

        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput, responseLength }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('thinking-message')?.remove();
            if (!data.botResponse.trim()) {
                alert("No response received.");
                return;
            }

            displayMessage(data.botResponse, 'bot');
            latestRecipe = data.botResponse; // ✅ Store recipe for saving
        })
        .catch(error => {
            console.error("Error:", error);
            displayMessage("Sorry, something went wrong.", 'bot');
            document.getElementById('thinking-message')?.remove();
        });
    }

    // ✅ Function to get a random recipe
    function fetchRandomRecipe() {
        displayMessage("Fetching a random recipe...", "bot");

        fetch("/random-recipe", {
            method: "GET",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            displayMessage(data.botResponse, "bot");
            latestRecipe = data.botResponse; // ✅ Store random recipe for saving
        })
        .catch(error => {
            console.error("Error fetching random recipe:", error);
            displayMessage("Error fetching recipe. Try again.", "bot");
        });
    }

    // ✅ Function to save the latest recipe
    function saveRecipe() {
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
    }

    // ✅ Display message function
    function displayMessage(message, sender) {
        const chatBox = document.getElementById('chat-box');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.innerHTML = `<p>${message}</p>`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageDiv;
    }

    // ✅ Attach event listeners
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById("random-recipe-btn").addEventListener("click", fetchRandomRecipe);
    document.getElementById("save-recipe-btn").addEventListener("click", saveRecipe);
});
