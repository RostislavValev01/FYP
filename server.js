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
app.get('/get-recipes', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "You need to log in to view your recipes." });
    }

    try {
        const recipes = await Recipe.find({ user: req.session.user._id });
        res.json({ success: true, recipes });
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ success: false, message: "Error retrieving recipes." });
    }
});

// Check if user is logged in
app.get('/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, email: req.session.user.email });
    } else {
        res.json({ loggedIn: false });
    }
});
//Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).json({ success: false, message: "Error logging out." });
        }
        res.json({ success: true, message: "Logged out successfully!" });
    });
});

// Chatbot logic with response length control
app.post('/chat', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ botResponse: "You need to log in to request a recipe." });
    }

    const userInput = req.body.userInput;
    const responseLength = req.body.responseLength || "2"; //Get response length from request

    if (!userInput) {
        return res.status(400).json({ botResponse: "Please enter a valid recipe request." });
    }

    let lengthInstruction = "";
    if (responseLength === "1") {
        lengthInstruction = "Provide a concise yet useful response.";
    } else if (responseLength === "3") {
        lengthInstruction = "Provide an extremely detailed response.";
    } else {
        lengthInstruction = "Provide a balanced response.";
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

        const result = await model.generateContent(prompt);
        let botResponse = result.response.text();

        // Ensure response keeps structured format including line breaks
        botResponse = botResponse.replace(/\n/g, '<br>');

        res.json({ botResponse });
    } catch (error) {
        console.error("Error with API request: ", error);
        res.status(500).json({ botResponse: "Error: Something went wrong. Try again later." });
    }
});




// User sign-up
app.post('/signup', async (req, res) => {
    const { email, password, preferences, goal } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Ensure preferences is always an array
        const formattedPreferences = Array.isArray(preferences) ? preferences : [preferences];

        const newUser = new User({ 
            email, 
            password: hashedPassword, 
            preferences: formattedPreferences, 
            goal 
        });

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

        // Store user in session with ID
        req.session.user = {
            _id: user._id,  // Ensure _id is included
            email: user.email,
            preferences: user.preferences,
            goal: user.goal
        };

        res.redirect('/index.html');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Restrict access to recipes page
app.get('/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ 
            loggedIn: true, 
            email: req.session.user.email 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/account-data', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const user = await User.findOne({ email: req.session.user.email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            email: user.email,
            preferences: user.preferences || [],
            goal: user.goal || "Not Set"
        });
    } catch (err) {
        console.error("Error fetching account data:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.post('/save-recipe', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, message: "You need to log in to save recipes." });
    }

    const { recipeContent } = req.body;

    if (!recipeContent || recipeContent.trim() === "") {
        return res.status(400).json({ success: false, message: "Recipe content is required." });
    }

    try {
        const newRecipe = new Recipe({
            user: req.session.user._id, 
            content: recipeContent
        });

        await newRecipe.save();
        res.json({ success: true, message: "Recipe saved successfully!" });
    } catch (error) {
        console.error("Error saving recipe:", error);
        res.status(500).json({ success: false, message: "Error saving recipe." });
    }
});







app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});