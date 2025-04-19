const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workplace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workplace', required: true },
    content: { type: String, required: true },
    title: { type: String },          
    description: { type: String },    
    createdAt: { type: Date, default: Date.now }
});

const Recipe = mongoose.model('Recipe', RecipeSchema);
module.exports = Recipe;
