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

// Chatbot logic
app.post('/chat', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ botResponse: "You need to log in to request a recipe." });
    }

    const userInput = req.body.userInput;
    if (!userInput) {
        return res.status(400).json({ botResponse: "Please enter a valid recipe request." });
    }

    try {
        const prompt = `
        You are a friendly and engaging AI Chef assistant. Your goal is to provide detailed, well-structured, and interactive cooking guidance. Format your responses in an easy-to-read style with clear sections and helpful information.

        **Response Format:**
        - **Servings**
        - **Prep & Cook Time**
        - **Ingredients**
        - **Instructions**
        - **Ingredient Substitutions & Variations**
        - **Fun Facts & Cooking Tips**
        
        **Ingredient Substitutions & Variations:**
        - If the user might not have an ingredient, suggest **common swaps** (e.g., buttermilk → milk + lemon juice).
        - Offer **dietary-friendly versions**:
            - **Vegan:** Replace animal products with plant-based options.
            - **Halal/Kosher:** Suggest non-pork and alcohol-free substitutes.
            - **Gluten-free:** Recommend GF flour and alternative thickeners.
            - **Low-carb/Keto:** Adjust ingredients to minimize carbs.
        - Include **fun modifications** (e.g., "Want extra spice? Add chili flakes!").

        **Fun Facts & Cooking Tips:**
        - Always include an **interesting fact** related to the dish. Example: "Did you know that Tiramisu means ‘pick me up’ in Italian because of its caffeine content?" ☕
        - Share **a pro cooking tip** to improve the recipe. Example: "For the crispiest fries, soak the potatoes in cold water for 30 minutes before frying!"
        - Keep it **engaging and educational** while making cooking fun.

        **Make it fun!**
        - Be conversational and engaging.
        - Encourage creativity and experimentation.
        - Provide cooking tips and fun facts where relevant. 

        Now generate a recipe based on this format: "${userInput}"`;

        console.log("Prompt sent to model: ", prompt);

        const result = await model.generateContent(prompt);
        let botResponse = result.response?.text?.() || "Error: Could not generate a response. Try again.";
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
