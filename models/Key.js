const mongoose = require("mongoose");
const { Schema } = mongoose;

const keySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    publicKey: String,
    secretKey: String
});

const Key = mongoose.model("Key", keySchema);

module.exports = Key;
