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
        // Generate content using the Gemini model
        const result = await model.generateContent(userInput);  // Pass the user input as the prompt
        const botResponse = result.response.text();  // Get the generated response

        // Send the bot's response back to the client
        res.json({ botResponse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with the API request' });  // Handle any errors
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
