// Load environment variables from .env file
require('dotenv').config();  // This allows you to use the API key stored in the .env file

// Import required modules
const express = require('express');  // Express to create the server
const { GoogleGenerativeAI } = require('@google/generative-ai');  // Import the Google Generative AI SDK
const app = express();  // Initialize the express app
const port = 3000;  // Port for the server to run on

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.static('public'));  // Serve static files like images

// Initialize the Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  // Use the API key from the .env file
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });  // Specify the model you want to use

// API route to handle chatbot requests
app.post('/chat', async (req, res) => {
    const userInput = req.body.userInput;  // Extract user input from the request body

    if (!userInput) {
        return res.status(400).json({ error: 'User input is required' });  // If no input, return an error
    }

    try {
        // Define the explicit instructions for the model
        const instructions = `
            You are a chatbot specifically designed to recommend cooking recipes and assist with cooking-related queries.
            - You can provide recipes with ingredients, step-by-step instructions and create shopping lists when asked.
            - If asked about what you can do, say: "I can recommend recipes, suggest ingredients, provide cooking instructions and create shopping lists."
            - If the user asks about anything unrelated to cooking, respond politely by saying: "Sorry, I can only assist with cooking-related questions."
            - Always respond in a structured format, especially when providing recipes: List the ingredients first, followed by step-by-step instructions.
        `;

        // Combine the instructions with the user's input to form the full prompt
        const prompt = instructions + "\n\nUser: " + userInput + "\n\nBot:";

        // Log the prompt for debugging purposes
        console.log("Prompt sent to model: ", prompt);

        // Generate content using the Gemini model
        const result = await model.generateContent(prompt);  // Pass the modified prompt
        const botResponse = result.response.text();  // Extract the generated response

        // Log the response for debugging purposes
        console.log("Response from model: ", botResponse);

        // Send the bot's response back to the client
        res.json({ botResponse });
    } catch (error) {
        console.error("Error with API request: ", error);
        res.status(500).json({ error: 'Error with the API request' });  // Handle any errors
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
