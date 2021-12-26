const mongoose = require("mongoose");
const { Schema } = mongoose;

const coinSchema = new Schema({
    name: { type: String, unique: true },
    isActive: Boolean
});

const Coin = mongoose.model("Coin", coinSchema);

module.exports = Coin;
