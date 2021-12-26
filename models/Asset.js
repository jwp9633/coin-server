const mongoose = require("mongoose");
const { Schema } = mongoose;

const assetSchema = new Schema({
    name: String,
    balance: Number,
    user: { type: Schema.Types.ObjectId, ref: "User" }
});

assetSchema.index({ name: 1, user: 1 }, { unique: true });
const Asset = mongoose.model("Asset", assetSchema);

module.exports = Asset;
