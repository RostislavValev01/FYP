// Load environment variables from .env file (API key, DB credentials, etc.)
require('dotenv').config();  

// Import necessary modules
const express = require('express');  // For creating the server
const { GoogleGenerativeAI } = require('@google/generative-ai');  // For Google AI integration
const mongoose = require('mongoose');  // For MongoDB connection
const bcrypt = require('bcryptjs');  // For hashing passwords
const session = require('express-session');  // For handling user sessions
const User = require('./models/User');  // User model for MongoDB
const app = express();  // Initialize Express app
const port = 3000;  // Set server port

// Middleware to parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // For handling form submissions
app.use(express.static('public'));  // Serve static files (like images)

// Set up Google Generative AI client with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });  // Choose model

// Connect to MongoDB using the URI from .env
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// Session setup to keep track of logged-in users
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

// Handle chatbot requests
app.post('/chat', async (req, res) => {
    const userInput = req.body.userInput;  // Get user input

    if (!userInput) {
        return res.status(400).json({ error: 'User input is required' });  // If no input, return error
    }

    try {
        // Define instructions for the chatbot
        const instructions = `You are a chatbot specifically designed to recommend cooking recipes...`;

        // Combine instructions with user input
        const prompt = instructions + "\n\nUser: " + userInput + "\n\nBot:";

        // Log the prompt for debugging
        console.log("Prompt sent to model: ", prompt);

        // Generate a response from the model
        const result = await model.generateContent(prompt);  
        const botResponse = result.response.text();  // Get the response text

        // Log the response for debugging
        console.log("Response from model: ", botResponse);

        // Send the bot's response back to the client
        res.json({ botResponse });
    } catch (error) {
        console.error("Error with API request: ", error);
        res.status(500).json({ error: 'Error with the API request' });  // Handle any errors
    }
});

// Sign In Route
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid password');
        }

        req.session.user = user;  // Store user in session
        res.redirect('/');  // Redirect to the homepage
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Sign Up Route
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(password, 10);  // Hash the password

        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();  // Save the new user

        res.redirect('/signin');  // Redirect to sign-in page after successful sign-up
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Pass user data to all views for easy access
app.use((req, res, next) => {
    res.locals.user = req.session.user;  // Add user to all views
    next();
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
