const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    preferences: { type: [String], default: [] },
    goal: { type: String, default: "Not Set" }
});

// Correctly export the model once
const User = mongoose.model('User', UserSchema);
module.exports = User;
