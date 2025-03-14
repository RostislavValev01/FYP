document.addEventListener("DOMContentLoaded", function () {
    const randomRecipeBtn = document.getElementById("random-recipe-btn");
    let isLoggedIn = false; // Track login status

    // Check login status on page load
    fetch('/check-login')
    .then(response => response.json())
    .then(data => {
        const accountBtn = document.getElementById("account-btn");
        if (data.loggedIn) {
            accountBtn.textContent = "My Account";
            accountBtn.href = "account.html";

            // ✅ Fetch workplaces when user logs in
            fetch('/workplaces', { method: "GET", credentials: "include" })
                .then(response => response.json())
                .then(workspaceData => {
                    if (workspaceData.success && workspaceData.workplaces.length > 0) {
                        localStorage.setItem("workplaces", JSON.stringify(workspaceData.workplaces));
                        renderWorkplaces(); // ✅ Refresh UI
                        switchWorkplace(workspaceData.workplaces[0]._id); // Auto-switch to first workplace
                    } else {
                        console.log("🚀 No workplaces found. Creating a new one...");
                        createNewWorkplace();
                    }
                });
        } else {
            accountBtn.textContent = "Sign In";
            accountBtn.href = "signin.html";

            // ✅ Clear workplaces on logout
            localStorage.removeItem("workplaces");
            localStorage.removeItem("activeWorkplace");
        }
    })
    .catch(error => console.error("Error checking login status:", error));


    function switchWorkplace(workplaceId) {
        console.log("🔄 Switching to workplace:", workplaceId);
    
        fetch(`/workplaces/${workplaceId}`, {
            method: "GET",
            credentials: "include",
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert("Failed to switch workplace.");
                return;
            }
    
            // ✅ Store the selected workplace in localStorage
            localStorage.setItem("activeWorkplace", workplaceId);
    
            // ✅ Clear the chat box before adding new messages
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML = ""; // ✅ Prevent duplicate messages
    
            data.workplace.messages.forEach(msg => {
                displayMessage(msg.text, msg.sender);
            });
    
            // ✅ Update UI: Highlight selected workplace
            document.querySelectorAll(".workplace-item").forEach(item => {
                item.classList.remove("active-workplace"); // Remove highlight from all
                if (item.dataset.id === workplaceId) {
                    item.classList.add("active-workplace"); // Highlight selected
                }
            });
    
        })
        .catch(error => console.error("Error switching workplace:", error));
    }
    
    

    function renderWorkplaces() {
        fetch('/workplaces', { method: "GET", credentials: "include" })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem("workplaces", JSON.stringify(data.workplaces));
    
                const workplacesContainer = document.getElementById("workplaces-container");
                workplacesContainer.innerHTML = ""; // Clear previous workplaces
    
                if (data.workplaces.length === 0) {
                    console.log("🚀 No workplaces found. Creating a new one...");
                    createNewWorkplace();
                    return;
                }
    
                data.workplaces.forEach(workplace => {
                    const workplaceDiv = document.createElement("div");
                    workplaceDiv.classList.add("workplace-item");
                    workplaceDiv.textContent = workplace.name;
                    workplaceDiv.dataset.id = workplace._id;
    
                    // ✅ Attach click event to switch workplaces
                    workplaceDiv.addEventListener("click", () => switchWorkplace(workplace._id));
    
                    workplacesContainer.appendChild(workplaceDiv);
                });
    
                // ✅ Automatically switch to the first available workplace if none is selected
                if (!localStorage.getItem("activeWorkplace") && data.workplaces.length > 0) {
                    switchWorkplace(data.workplaces[0]._id);
                }
            }
        })
        .catch(error => console.error("Error fetching workplaces:", error));
    }
    
    
    //  Store latest recipe for saving
    let latestRecipe = "";
    
    
    
    function sendMessage() {
        let userInput = document.getElementById('user-input').value.trim();
    
        if (!userInput) {
            alert("Please enter a valid message.");
            return;
        }
    
        let workplaceId = localStorage.getItem("activeWorkplace");
    
        // ✅ If no active chat session, create a new one before sending the message
        if (!workplaceId) {
            console.log("🚀 No active chat session found. Creating a new one...");
            createNewWorkplace((newWorkplaceId) => {
                sendChatMessage(userInput, newWorkplaceId);
            });
        } else {
            sendChatMessage(userInput, workplaceId);
        }
    }
    
    // ✅ Helper function to send messages
    function sendChatMessage(userInput, workplaceId) {
        console.log("📢 Sending chat request with workplaceId:", workplaceId);
    
        displayMessage(userInput, 'user');
        document.getElementById('user-input').value = "";
    
        const thinkingMessage = displayMessage("Thinking...", 'bot');
        thinkingMessage.id = "thinking-message";
        
        const responseLength = document.getElementById("response-length").value;
    
        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput, workplaceId, responseLength }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('thinking-message')?.remove();
    
            console.log("📢 Chatbot Response:", data.botResponse);
    
            if (!data.botResponse.trim()) {
                alert("No response received.");
                return;
            }
    
            displayMessage(data.botResponse, 'bot');
    
            // ✅ Store the last recipe received
            latestRecipe = data.botResponse;
        })
        .catch(error => {
            console.error("🚨 Error:", error);
            displayMessage("Sorry, something went wrong.", 'bot');
            document.getElementById('thinking-message')?.remove();
        });
    }
    
    
    const newChatBtn = document.getElementById("new-chat-btn");




    newChatBtn.addEventListener("click", function () {
        console.log("🆕 'Create New Chat' button clicked!");
        createNewWorkplace();
    });
    
   
    
    
    
    

    // Function to get a random recipe
    function fetchRandomRecipe() {
        if (!isLoggedIn) {
            alert("You must be logged in to generate a random recipe.");
            return;
        }

        displayMessage("Fetching a random recipe...", "bot");

        fetch("/random-recipe", {
            method: "GET",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            displayMessage(data.botResponse, "bot");
            latestRecipe = data.botResponse; // Store random recipe for saving
        })
        .catch(error => {
            console.error("Error fetching random recipe:", error);
            displayMessage("Error fetching recipe. Try again.", "bot");
        });
    }

    
   // Function to save the latest recipe associated with the active workplace
function saveRecipe() {
    const workplaceId = localStorage.getItem("activeWorkplace");

    if (!latestRecipe || latestRecipe.trim() === "") {
        alert("No recipe to save.");
        return;
    }

    if (!workplaceId) {
        alert("No active workplace selected. Please create or select a chat session.");
        return;
    }

    fetch("/save-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeContent: latestRecipe, workplaceId }),
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


    // Display message function
    function displayMessage(message, sender) {
        const chatBox = document.getElementById('chat-box');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.innerHTML = `<p>${message}</p>`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageDiv;
    }

    // Attach event listeners
    const sendButton = document.getElementById("send-btn");

if (sendButton) {
    sendButton.addEventListener("click", function () {
        console.log("📩 Send button clicked!");
        sendMessage();
    });
} else {
    console.error("🚨 'Send' button not found in DOM.");
}

    randomRecipeBtn.addEventListener("click", fetchRandomRecipe);
    document.getElementById("save-recipe-btn").addEventListener("click", saveRecipe);
});
function createNewWorkplace() {
    console.log("🚀 Creating a new workplace...");

    fetch('/workplaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success || !data.workplace) { // ✅ Only refresh if creation was successful
            console.error("🚨 API Error: Failed to create a workplace:", data);
            alert("Error creating a chat session. Please try again.");
            return;
        }

        console.log("✅ New workplace created:", data.workplace);

        // ✅ Force a page reload after chat creation
        setTimeout(() => {
            window.location.reload();
        }, 500);
    })
    .catch(error => {
        console.error("🚨 Network Error: Could not create a workplace:", error);
        alert("Error creating a chat session.");
    });
}




document.addEventListener("DOMContentLoaded", function () {
    fetch('/workplaces', { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem("workplaces", JSON.stringify(data.workplaces));
            renderWorkplaces(); // ✅ Ensure UI updates
            if (data.workplaces.length > 0) {
                switchWorkplace(data.workplaces[0]._id);
            } else {
                console.log("🚀 No workplaces found. Click 'Create New Chat' to start.");
            }
            
        }
    })
    .catch(error => console.error("Error fetching workplaces on load:", error));
});





