const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Key = require("./models/Key");

const encryptPassword = (password) => {
    return crypto.createHash("sha512").update(password).digest("base64");
};

const setAuth = async (req, res, next) => {
    const authorization = req.headers.authorization;
    const [bearer, token] = authorization.split(" ");
    if (bearer !== "Bearer")
        return res.send({ error: "Wrong Authorization" }).status(400);

    const userPublicKey = await jwt.decode(token).publicKey;
    const userKey = await Key.findOne({ publicKey: userPublicKey });
    const userSecretKey = userKey.secretKey;
    try {
        await jwt.verify(token, userSecretKey);
    } catch (err) {
        if (err.name === "JsonWebTokenError")
            return res.send({ error: "Invalid signature" }).status(403);
        if (err.name === "TokenExpiredError")
            return res.send({ error: "JWT expired" }).status(403);
    }

    const user = await User.findOne({ userPublicKey });

    if (!user) return res.send({ error: "Cannot find user" }).status(404);

    req.user = user;
    return next();
};

module.exports = {
    encryptPassword,
    setAuth
};
