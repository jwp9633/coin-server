const mongoose = require("mongoose");

const User = require("./User");
const Coin = require("./Coin");
const Asset = require("./Asset");
const Key = require("./Key");

const mongoURL =
    "mongodb+srv://test0:test0@testmongo.tq4im.mongodb.net/coinServer?retryWrites=true&w=majority";
mongoose.connect(mongoURL);

module.exports = {
    User,
    Coin,
    Asset,
    Key
};
