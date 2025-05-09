document.addEventListener("DOMContentLoaded", function () {
    const randomRecipeBtn = document.getElementById("random-recipe-btn");
    let isLoggedIn = false; // Track login status

    // Check login status on page load
    fetch('/check-login')
    .then(response => response.json())
    .then(data => {
        const accountBtn = document.getElementById("account-btn");
        if (data.loggedIn) {
            accountBtn.innerHTML = '<i class="fa fa-user"></i> My Account';

            accountBtn.href = "account.html";
            isLoggedIn = true; 
            fetchRecommendations();

            // Fetch workplaces when user logs in
            fetch('/workplaces', { method: "GET", credentials: "include" })
                .then(response => response.json())
                .then(workspaceData => {
                    if (workspaceData.success && workspaceData.workplaces.length > 0) {
                        localStorage.setItem("workplaces", JSON.stringify(workspaceData.workplaces));
                        renderWorkplaces(); //Refresh UI
                        switchWorkplace(workspaceData.workplaces[0]._id); // Auto-switch to first workplace
                    } else {
                        console.log("No workplaces found. Creating a new one...");
                        createNewWorkplace();
                    }
                });
        } else {
            accountBtn.innerHTML = '<i class="fa fa-sign-in"></i> Sign In';

            accountBtn.href = "signin.html";
            isLoggedIn = false;
            document.getElementById("recommendation-container").innerHTML = "<p>Login to see recommendations.</p>";

            // Clear workplaces on logout
            localStorage.removeItem("workplaces");
            localStorage.removeItem("activeWorkplace");
            renderWorkplaces(); // show guest greeting

        }
    })
    .catch(error => console.error("Error checking login status:", error));

    function fetchRecommendations() {
        fetch('/recipe-recommendations', {
            method: "GET",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.recommendations || data.recommendations.length === 0) {
                document.getElementById("recommendation-container").innerHTML = "<p>No recommendations available.</p>";
                return;
            }
    
            const recommendationContainer = document.getElementById("recommendation-container");
            recommendationContainer.innerHTML = ""; 
    
            const shownRecipes = new Set(); // Track recipes shown

data.recommendations.forEach(recipe => {
    shownRecipes.add(recipe); // Mark it as shown

    const recipeDiv = document.createElement("div");
    recipeDiv.classList.add("recommendation-item");
    recipeDiv.textContent = recipe;

    recipeDiv.addEventListener("click", function () {
        sendChatMessage(`Can you give me a recipe for ${this.textContent}?`, localStorage.getItem("activeWorkplace"));


        // Replace with a new one
        fetch("/recipe-recommendations", {
            method: "GET",
            credentials: "include"
        })
        .then(res => res.json())
        .then(fresh => {
            if (fresh.success && fresh.recommendations) {
                // Find a recipe not already shown
                const newRecipe = fresh.recommendations.find(r => !shownRecipes.has(r));
                if (newRecipe) {
                    shownRecipes.add(newRecipe);
                    this.textContent = newRecipe;
                } else {
                    this.remove(); // Fallback: remove if no more unique recipes
                }
            }
        })
        .catch(err => {
            console.error("Error replacing recommendation:", err);
        });
    });

    recommendationContainer.appendChild(recipeDiv);
});

        })
        .catch(error => {
            console.error("Error fetching recommendations:", error);
            document.getElementById("recommendation-container").innerHTML = "<p>Error loading recommendations.</p>";
        });
    }
    function switchWorkplace(workplaceId) {
        console.log("Switching to workplace:", workplaceId);
    
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
    
            // Store the selected workplace in localStorage
            localStorage.setItem("activeWorkplace", workplaceId);
    
            // Clear the chat box before adding new messages
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML = ""; // Prevent duplicate messages
    
            if (data.workplace.messages.length === 0) {
                const greeting = isLoggedIn
    ? "Hello! I'm your personal chef assistant, how can I help?"
    : `Hi chef! I'm your personal cooking assistant. I can give you step-by-step cooking instructions, create meal plans, recommend recipes based on your preferences, and even suggest meals using leftovers from your fridge. You can also save your favorite recipes for later—just log in or create an account to get started!`;

                displayMessage(greeting, "bot");
            
                // Save the greeting to the backend
                fetch(`/workplaces/${workplaceId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ sender: "bot", text: greeting })
                }).catch(console.error);
            } else {
                data.workplace.messages.forEach(msg => {
                    displayMessage(msg.text, msg.sender);
                });
            }
            
    
            // Update UI: Highlight selected workplace
            document.querySelectorAll(".workplace-item").forEach(item => {
                item.classList.remove("active-workplace"); // Remove highlight from all
                if (item.dataset.id === workplaceId) {
                    item.classList.add("active-workplace"); // Highlight selected
                }
            });
    
        })
        .catch(error => console.error("Error switching workplace:", error));
    }
    
    function deleteWorkplace(workplaceId) {
        if (!confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;
    
        fetch(`/workplaces/${workplaceId}`, {
            method: "DELETE",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Chat deleted successfully!");
                renderWorkplaces(); 
            } else {
                alert("Failed to delete chat.");
            }
        })
        .catch(error => console.error("Error deleting workplace:", error));
    }
    

    function renderWorkplaces() {
        fetch('/workplaces', { method: "GET", credentials: "include" })
            .then(response => {
                if (!response.ok) throw new Error("Not logged in");
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    localStorage.setItem("workplaces", JSON.stringify(data.workplaces));
    
                    const workplacesContainer = document.getElementById("workplaces-container");
                    workplacesContainer.innerHTML = ""; // Clear previous workplaces
    
                    if (data.workplaces.length === 0) {
                        console.log("No workplaces found. Creating a new one...");
                        createNewWorkplace();
                        return;
                    }
    
                    const showDelete = data.workplaces.length > 1;
    
                    data.workplaces.forEach(workplace => {
                        const workplaceDiv = document.createElement("div");
                        workplaceDiv.classList.add("workplace-item");
                        workplaceDiv.textContent = workplace.name;
                        workplaceDiv.dataset.id = workplace._id;
    
                        workplaceDiv.addEventListener("click", () => switchWorkplace(workplace._id));
    
                        const buttonGroup = document.createElement("div");
                        buttonGroup.classList.add("workplace-button-group");
    
                        if (showDelete) {
                            const deleteBtn = document.createElement("button");
                            deleteBtn.classList.add("delete-workplace-btn");
                            deleteBtn.textContent = "Remove";
                            deleteBtn.addEventListener("click", (event) => {
                                event.stopPropagation();
                                deleteWorkplace(workplace._id);
                            });
                            buttonGroup.appendChild(deleteBtn);
                        }
    
                        const editBtn = document.createElement("button");
                        editBtn.classList.add("edit-workplace-btn");
                        editBtn.textContent = "Edit";
                        editBtn.style.color = "blue";
    
                        editBtn.addEventListener("click", (event) => {
                            event.stopPropagation();
                            const newName = prompt("Enter a new name for this chat:", workplace.name);
                            if (newName && newName.trim().length > 1) {
                                fetch(`/workplaces/${workplace._id}/rename`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ newName }),
                                    credentials: "include"
                                })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.success) {
                                        renderWorkplaces();
                                    } else {
                                        alert("Failed to rename chat.");
                                    }
                                })
                                .catch(err => {
                                    console.error("Rename error:", err);
                                    alert("Rename failed.");
                                });
                            }
                        });
    
                        buttonGroup.appendChild(editBtn);
                        workplaceDiv.appendChild(buttonGroup);
                        workplacesContainer.appendChild(workplaceDiv);
                    });
    
                    // Auto-switch to first if none selected
                    if (!localStorage.getItem("activeWorkplace") && data.workplaces.length > 0) {
                        switchWorkplace(data.workplaces[0]._id);
                    }
                }
            })
            .catch(() => {
                // Fallback for not logged in
                const greeting = `Hi chef! I'm your personal cooking assistant. I can give you step-by-step cooking instructions, create meal plans, recommend recipes based on your preferences, and even suggest meals using leftovers from your fridge. You can also save your favorite recipes for later—just log in or create an account to get started!`;
                displayMessage(greeting, "bot");
            });
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
            console.log("No active chat session found. Creating a new one...");
            createNewWorkplace((newWorkplaceId) => {
                sendChatMessage(userInput, newWorkplaceId);
            });
        } else {
            sendChatMessage(userInput, workplaceId);
        }
    }
    
    // Helper function to send messages
    function sendChatMessage(userInput, workplaceId) {
        console.log("Sending chat request with workplaceId:", workplaceId);
    
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
    
            console.log("Chatbot Response:", data.botResponse);
    
            if (!data.botResponse.trim()) {
                alert("No response received.");
                return;
            }
    
            displayMessage(data.botResponse, 'bot');
            renderWorkplaces();
            // Store the last bot message for context
            latestRecipe = data.botResponse;
        })
        .catch(error => {
            console.error("Error:", error);
            displayMessage("Sorry, something went wrong.", 'bot');
            document.getElementById('thinking-message')?.remove();
        });
    }
    
    
    
    const newChatBtn = document.getElementById("new-chat-btn");




    newChatBtn.addEventListener("click", function () {
        console.log("'Create New Chat' button clicked!");
        createNewWorkplace();
    });
    
   
    
    
    
    

    // Function to get a random recipe
    function fetchRandomRecipe() {
        if (!isLoggedIn) {
            alert("You must be logged in to generate a random recipe.");
            return;
        }

        displayMessage("Fetching a random recipe...", "bot");
        
        const responseLength = document.getElementById("response-length").value;
const workplaceId = localStorage.getItem("activeWorkplace");

fetch("/random-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responseLength, workplaceId }),
    credentials: "include"
})

        .then(response => response.json())
        .then(data => {
            displayMessage(data.botResponse, "bot");
            latestRecipe = data.botResponse; // Store random recipe for saving
            renderWorkplaces(); // Refresh chat titles after random recipe

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
        messageDiv.innerHTML = marked.parse(message);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageDiv;
    }

    
    const sendButton = document.getElementById("send-btn");
    const userInputField = document.getElementById("user-input");

    userInputField.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); 
            sendMessage();          
        }
    });
    
if (sendButton) {
    sendButton.addEventListener("click", function () {
        console.log("Send button clicked!");
        sendMessage();
    });
} else {
    console.error("'Send' button not found in DOM.");
}

    randomRecipeBtn.addEventListener("click", fetchRandomRecipe);
    document.getElementById("save-recipe-btn").addEventListener("click", saveRecipe);
});
function createNewWorkplace() {
    console.log("Creating a new workplace...");

    fetch('/workplaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success || !data.workplace) { //  Only refresh if creation was successful
            console.error("API Error: Failed to create a workplace:", data);
            alert("Please login before you can request a recipe.");
            return;
        }

        console.log(" New workplace created:", data.workplace);

        //  Force a page reload after chat creation
        setTimeout(() => {
            window.location.reload();
        }, 500);
    })
    .catch(error => {
        console.error("Network Error: Could not create a workplace:", error);
        alert("Error creating a chat session.");
    });
}


document.addEventListener("DOMContentLoaded", function () {
    const changePasswordForm = document.getElementById("change-password-form");

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const oldPassword = document.getElementById("old-password").value;
            const newPassword = document.getElementById("new-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (newPassword !== confirmPassword) {
                alert("New passwords do not match!");
                return;
            }

            fetch("/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldPassword, newPassword }),
                credentials: "include"
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Password changed successfully!");
                    window.location.href = "account.html";
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error("Error changing password:", error));
        });
    }
});


document.addEventListener("DOMContentLoaded", function () {
    fetch('/workplaces', { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem("workplaces", JSON.stringify(data.workplaces));
            renderWorkplaces(); //  Ensure UI updates
            if (data.workplaces.length > 0) {
                switchWorkplace(data.workplaces[0]._id);
            } else {
                console.log("No workplaces found. Click 'Create New Chat' to start.");
            }
            
        }
    })
    .catch(error => console.error("Error fetching workplaces on load:", error));
});



