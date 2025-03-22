require('dotenv').config();

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const User = require('./models/User');
const Recipe = require('./models/recipes');
const Workplace = require('./models/Workplace');
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
app.get('/workplaces', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

    try {
        let workplaces = await Workplace.find({ user: req.session.user._id });

        // If no workplaces exist, create one automatically
        if (!workplaces || workplaces.length === 0) {
            console.log("No workplaces found. Creating a new one...");
            const newWorkplace = new Workplace({
                user: req.session.user._id,
                name: `Chat ${new Date().toLocaleString()}`,
                messages: []
            });
            await newWorkplace.save();
            workplaces = [newWorkplace]; // Assign the new workplace
        }

        res.json({ success: true, workplaces });
    } catch (error) {
        console.error("Error fetching workplaces:", error);
        res.status(500).json({ success: false, message: "Error retrieving workplaces." });
    }
});




// Create a new workplace (new chat session)
app.post('/workplaces', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

    try {
        console.log("Creating a new workplace for user:", req.session.user._id);
        
        const newWorkplace = new Workplace({
            user: req.session.user._id,
            name: `Chat ${new Date().toLocaleString()}`,
            messages: [
                { sender: "bot", text: "Hello! I'm your personal chef assistant, how can I help?" }
            ]
        });

        await newWorkplace.save();
        console.log("Workplace successfully created:", newWorkplace);
        
        res.json({ success: true, workplace: newWorkplace });
    } catch (error) {
        console.error("Error creating workplace:", error);
        res.status(500).json({ success: false, message: "Error creating workplace." });
    }
});



// Get a specific workplace's chat history
app.get('/workplaces/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const workplace = await Workplace.findOne({ _id: req.params.id, user: req.session.user._id });

        if (!workplace) return res.status(404).json({ message: "Workplace not found" });

        res.json({ success: true, workplace });
    } catch (error) {
        console.error("Error fetching workplace:", error);
        res.status(500).json({ success: false, message: "Error retrieving workplace." });
    }
});

// Save chat messages to a workplace
app.post('/workplaces/:id/messages', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const { sender, text } = req.body;
        const workplace = await Workplace.findOne({ _id: req.params.id, user: req.session.user._id });

        if (!workplace) return res.status(404).json({ message: "Workplace not found" });

        workplace.messages.push({ sender, text });
        await workplace.save();

        res.json({ success: true, workplace });
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ success: false, message: "Error saving message." });
    }
});
// Serve the sign-in page
app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});
app.get('/get-recipes', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "You need to log in to view your recipes." });
    }

    try {
        const recipes = await Recipe.find({ user: req.session.user._id }).sort({ createdAt: -1 });

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



const { ObjectId } = mongoose.Types;

app.post('/chat', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ botResponse: "You need to log in to request a recipe." });
    }

    const userInput = req.body.userInput;
    const responseLength = req.body.responseLength || "2";
    const userPreferences = req.session.user.preferences || [];
    const workplaceId = req.body.workplaceId; 

    if (!userInput) {
        return res.status(400).json({ botResponse: "Please enter a valid question or request." });
    }

    if (!workplaceId || !mongoose.Types.ObjectId.isValid(workplaceId)) {
        return res.status(400).json({ botResponse: "Invalid Workplace ID." });
    }

    try {
        const workplace = await Workplace.findOne({ _id: workplaceId, user: req.session.user._id });

        if (!workplace) {
            return res.status(404).json({ botResponse: "Workplace not found." });
        }

        // Retrieve the last 5 messages from the conversation
        const recentMessages = workplace.messages.slice(-5).map(msg => `${msg.sender === "user" ? "User" : "Bot"}: ${msg.text}`).join("\n");

        let lengthInstruction = responseLength === "1" ? "Provide a concise response." :
                        responseLength === "3" ? "Provide an extremely detailed response." :
                        "Provide a balanced response.";

        let preferenceInstruction = userPreferences.length > 0 ? `Ensure the recipe follows these dietary preferences: ${userPreferences.join(", ")}.` : "";

        //Pass recent conversation history as context
        const prompt = `
        You are a friendly and engaging AI Chef assistant. You are in an ongoing conversation with the user. 
        Maintain continuity and answer follow-up questions accurately based on previous responses.

        **Conversation History:**
        ${recentMessages}

        **User's New Message:**
        "${userInput}"

        **Response Length:** ${lengthInstruction}
        **Dietary Preferences:** ${preferenceInstruction}

        Respond in a helpful, clear, and friendly manner.
        `;

        console.log("Sending AI request with context...");

        const result = await model.generateContent(prompt);

        if (!result || !result.response) {
            console.error("AI Response is invalid:", result);
            return res.status(500).json({ botResponse: "Error: AI did not return a valid response." });
        }

        let botResponse = result.response.text().replace(/\n/g, '<br>');

      // Add user and bot messages
workplace.messages.push({ sender: "user", text: userInput });
workplace.messages.push({ sender: "bot", text: botResponse });

// If this is the first actual user message (after intro)
if (workplace.messages.length === 3) {
    // Generate a smart title using AI
    const titlePrompt = `
    You are an assistant summarizing user messages for chat titles.
    Extract a short, clear, and descriptive title from this message:
    
    "${userInput}"

    Only return the title. Do not include extra text.
    `;

    try {
        const titleResult = await model.generateContent(titlePrompt);
        let newTitle = titleResult.response.text().trim();

        // Sanitize and fallback
        if (!newTitle || newTitle.length < 3) {
            newTitle = userInput.slice(0, 40);
        }

        workplace.name = newTitle;
    } catch (err) {
        console.error("Error generating smart title:", err);
        workplace.name = userInput.slice(0, 40);
    }
}

// Update workplace name
app.put('/workplaces/:id/rename', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { newName } = req.body;

    if (!newName || newName.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Name too short." });
    }

    try {
        const workplace = await Workplace.findOneAndUpdate(
            { _id: req.params.id, user: req.session.user._id },
            { name: newName.trim() },
            { new: true }
        );

        if (!workplace) {
            return res.status(404).json({ success: false, message: "Workplace not found." });
        }

        res.json({ success: true, workplace });
    } catch (error) {
        console.error("Error renaming workplace:", error);
        res.status(500).json({ success: false, message: "Error renaming chat." });
    }
});

await workplace.save();



        res.json({ botResponse });

    } catch (error) {
        console.error("Error with AI request:", error);
        res.status(500).json({ botResponse: "Error: AI processing failed. Try again later." });
    }
});



app.get('/recipe-recommendations', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "You need to log in to get recommendations." });
    }

    const userPreferences = req.session.user.preferences || [];

    let preferenceInstruction = userPreferences.length > 0
        ? `Generate 5 dish recommendations that follow these dietary preferences: ${userPreferences.join(", ")}.`
        : "Generate 5 completely random dish recommendations.";

    try {
        const prompt = `You are a recipe recommendation AI. Based on the following preferences, suggest 10 dish names:
        
        **User Preferences:** ${preferenceInstruction}
        
        Provide only dish names, separated by commas.`;

        const result = await model.generateContent(prompt);
        let recommendations = result.response.text().split(",").map(name => name.trim());

        res.json({ success: true, recommendations });
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).json({ success: false, message: "Error generating recommendations." });
    }
});



// Random Recipe Route
app.get('/random-recipe', async (req, res) => {
    const userPreferences = req.session.user ? req.session.user.preferences || [] : [];

    let preferenceInstruction = userPreferences.length > 0
        ? `Ensure the recipe strictly follows these dietary preferences: ${userPreferences.join(", ")}.`
        : "Generate any random recipe.";

    try {
        const prompt = `
        You are an AI chef. Generate a completely random but delicious recipe.
        **Dietary Preferences:** ${preferenceInstruction}
        `;

        const result = await model.generateContent(prompt);
        let botResponse = result.response.text().replace(/\n/g, '<br>');

        res.json({ botResponse });
    } catch (error) {
        console.error("Error with AI request:", error);
        res.status(500).json({ botResponse: "Error: Something went wrong. Try again later." });
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

app.delete('/workplaces/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
        const workplace = await Workplace.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });

        if (!workplace) {
            return res.status(404).json({ success: false, message: "Workplace not found." });
        }

        res.json({ success: true, message: "Workplace deleted successfully." });
    } catch (error) {
        console.error("Error deleting workplace:", error);
        res.status(500).json({ success: false, message: "Error deleting workplace." });
    }
});
app.delete('/delete-recipe/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });

        if (!recipe) {
            return res.status(404).json({ success: false, message: "Recipe not found." });
        }

        res.json({ success: true, message: "Recipe deleted successfully." });
    } catch (error) {
        console.error("Error deleting recipe:", error);
        res.status(500).json({ success: false, message: "Error deleting recipe." });
    }
});

app.post('/save-recipe', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, message: "You need to log in to save recipes." });
    }

    const { recipeContent, workplaceId } = req.body;

    if (!recipeContent || recipeContent.trim() === "") {
        return res.status(400).json({ success: false, message: "Recipe content is required." });
    }

    if (!workplaceId || !mongoose.Types.ObjectId.isValid(workplaceId)) {
        return res.status(400).json({ success: false, message: "Invalid Workplace ID." });
    }

    try {
        // Ensure the workplace belongs to the logged-in user
        const workplace = await Workplace.findOne({ _id: workplaceId, user: req.session.user._id });

        if (!workplace) {
            return res.status(404).json({ success: false, message: "Workplace not found." });
        }

        const newRecipe = new Recipe({
            user: req.session.user._id, 
            workplace: workplaceId,  // Associate recipe with workplace
            content: recipeContent
        });

        await newRecipe.save();
        res.json({ success: true, message: "Recipe saved successfully!" });
    } catch (error) {
        console.error("Error saving recipe:", error);
        res.status(500).json({ success: false, message: "Error saving recipe." });
    }
});

app.get('/passwordchange', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'passwordchange.html'));
});

app.post('/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect old password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});