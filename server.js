require('dotenv').config();

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const User = require('./models/User');
const Recipe = require('./models/recipes');
const app = express();
const port = 3000;

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Connect to database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

// Session settings
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Serve the sign-in page
app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});

// Check if user is logged in
app.get('/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, email: req.session.user.email });
    } else {
        res.json({ loggedIn: false });
    }
});

// Chatbot logic with response length control
app.post('/chat', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ botResponse: "You need to log in to request a recipe." });
    }

    const userInput = req.body.userInput;
    const responseLength = req.body.responseLength || "2"; // Default to medium length

    if (!userInput) {
        return res.status(400).json({ botResponse: "Please enter a valid recipe request." });
    }

    // Adjust response based on slider value
    let lengthInstruction = "";
    if (responseLength === "1") {
        lengthInstruction = "Provide a concise yet useful response, summarizing key points.";
    } else if (responseLength === "3") {
        lengthInstruction = "Provide an extremely detailed response with variations, tips, and fun facts.";
    } else {
        lengthInstruction = "Provide a balanced response with a good level of detail.";
    }

    try {
        const prompt = `
        You are a friendly and engaging AI Chef assistant. Your goal is to provide detailed, well-structured, and interactive cooking guidance.

        **Response Length Requirement:** ${lengthInstruction}

        **Response Format:**
        - **Servings**
        - **Prep & Cook Time**
        - **Ingredients**
        - **Instructions**
        - **Ingredient Substitutions & Variations**
        - **Fun Facts & Cooking Tips**
        
        **Safety & Responsibility:**
        - Do not generate responses that involve harmful, dangerous, or illegal content.
        - Keep all responses focused on cooking and food safety.

        Now, generate a response for the following user query:
        User: "${userInput}"
        Bot:
        `;

        console.log("Prompt sent to model: ", prompt);

        const result = await model.generateContent(prompt);
        let botResponse = result.response.text();
        botResponse = botResponse.replace(/\n/g, '<br>');

        console.log("Response from model: ", botResponse);

        // Save the recipe to the database
        const newRecipe = new Recipe({
            user: req.session.user._id,
            name: userInput,
            content: botResponse
        });
        await newRecipe.save();

        res.json({ botResponse });
    } catch (error) {
        console.error("Error with API request: ", error);
        res.status(500).json({ botResponse: "Error: Something went wrong. Try again later." });
    }
});

// User sign-up
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        res.send(`
            <script>
                alert("Account created successfully!");
                window.location.href = "/signin";
            </script>
        `);
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// User sign-in
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

        req.session.user = user;
        res.redirect('/index.html');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Restrict access to recipes page
app.get('/recipes', (req, res) => {
    if (!req.session.user) {
        return res.status(403).send(`
            <script>
                alert("You need to log in to access your recipes.");
                window.location.href = "/signin";
            </script>
        `);
    }
    res.sendFile(path.join(__dirname, 'public', 'recipes.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});