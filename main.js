const express = require("express");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const axios = require("axios");
const { encryptPassword, setAuth } = require("./utils");
const { User, Coin, Asset, Key } = require("./models");

const app = express();

const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
    res.send("지역시스템공학과 2017-16266 박종원").status(200);
});

app.post(
    "/register",
    body("name").isLength({ min: 4, max: 12 }).isAlphanumeric(),
    body("email").isEmail().isLength({ max: 99 }),
    body("password").isLength({ min: 8, max: 16 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorReason = [];
            for (const error of errors.array()) {
                if (error.param === "name") {
                    errorReason.push({
                        error: "Name error. Name is alphanumeric and 4 ~ 8 letters."
                    });
                } else if (error.param === "email") {
                    errorReason.push({
                        error:
                            "Email error. Email format is not correct, or no longer than 99 letters."
                    });
                } else if (error.param === "password") {
                    errorReason.push({
                        error: "Password error. Password is 8 ~ 16 letters."
                    });
                }
            }
            return res.json(errorReason).status(400);
        }

        const { name, email, password } = req.body;
        const encryptedPassword = encryptPassword(password);
        let user = null;
        try {
            user = new User({
                name: name,
                email: email,
                password: encryptedPassword
            });
            await user.save();
        } catch (err) {
            return res.send({ error: "email is duplicated" }).status(400);
        }

        // 10,000$ 제공
        const usdAsset = new Asset({ name: "USD", balance: 10000, user });
        await usdAsset.save();

        const coins = await Coin.find({ isActive: true });
        for (const coin of coins) {
            const asset = new Asset({ name: coin.name, balance: 0, user });
            await asset.save();
        }

        res.json({}).status(201);
    }
);

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const encryptedPassword = encryptPassword(password);
    const user = await User.findOne({ email, password: encryptedPassword });

    if (user === null)
        return res.json({ error: "Wrong email or password" }).status(400);

    // 키 생성
    const publicKey = encryptPassword(crypto.randomBytes(20));
    const secretKey = encryptPassword(crypto.randomBytes(20));
    const key = new Key({ user, publicKey, secretKey });
    await key.save();

    res
        .send({ key: { publicKey: key.publicKey, secretKey: key.secretKey } })
        .status(201);
});

app.get("/coins", async (req, res) => {
    const coins = await Coin.find({ isActive: true });
    const _coins = [];
    for (const coin of coins) {
        _coins.push(coin.name);
    }

    res.send(_coins).status(200);
});

app.get("/balance", setAuth, async (req, res) => {
    const user = req.user;

    const assets = await Asset.find({ user });
    const _assets = {};
    for (const asset of assets) {
        const assetName = asset.name;
        const assetBalance = asset.balance;
        if (assetBalance === 0) continue;
        _assets[assetName] = assetBalance;
    }
    res.send(_assets).status(200);
});

app.get("/coins/:coin_name", async (req, res) => {
    const coinId = req.params.coin_name; //ex. bitcoin
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const apiRes = await axios.get(url);
    const price = apiRes.data[coinId].usd;
    res.send({ price }).status(200);
});

app.post("/coin/:coin_name/buy", setAuth, async (req, res) => {
    const coinId = req.params.coin_name;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const apiRes = await axios.get(url);
    const price = apiRes.data[coinId].usd;
    const user = req.user;

    const assetUsd = await Asset.findOne({ user, name: "USD" });
    const assetCoin = await Asset.findOne({ user, name: coinId });

    if (req.body.all === "true") {
        const quantity = Math.floor((10000 * assetUsd.balance) / price) / 10000;
        assetUsd.balance -= quantity * price;
        assetCoin.balance += quantity;
        await assetUsd.save();
        await assetCoin.save();

        res.send({ price, quantity }).status(201);
    } else {
        let { quantity } = req.body;
        quantity = Number(quantity);
        if (quantity - Math.floor(quantity * 10000) / 10000 !== 0) {
            return res
                .send({ error: "소수점 넷째자리까지 주문이 가능합니다." })
                .status(400);
        } else if (assetUsd.balance < price * quantity) {
            return res.json({ error: "Insufficient balance" }).status(400);
        } else {
            try {
                assetUsd.balance -= price * quantity;
                assetCoin.balance += quantity;
                await assetUsd.save();
                await assetCoin.save();

                res.send({ price, quantity }).status(201);
            } catch (err) {
                return res.json({ error: err.name }).status(400);
            }
        }
    }
});

app.post("/coin/:coin_name/sell", setAuth, async (req, res) => {
    const coinId = req.params.coin_name;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const apiRes = await axios.get(url);
    const price = apiRes.data[coinId].usd;
    const user = req.user;

    const assetUsd = await Asset.findOne({ user, name: "USD" });
    const assetCoin = await Asset.findOne({ user, name: coinId });

    if (req.body.all === "true") {
        const quantity = Math.floor(assetCoin.balance * 10000) / 10000;
        assetUsd.balance += quantity * price;
        assetCoin.balance -= quantity;
        await assetUsd.save();
        await assetCoin.save();

        res.send({ price, quantity }).status(201);
    } else {
        let { quantity } = req.body;
        quantity = Number(quantity);
        if (quantity - Math.floor(quantity * 10000) / 10000 !== 0) {
            return res
                .send({ error: "소수점 넷째자리까지 주문이 가능합니다." })
                .status(400);
        } else if (assetCoin.balance < quantity) {
            return res.json({ error: "Insufficient balance" }).status(400);
        } else {
            try {
                assetUsd.balance += price * quantity;
                assetCoin.balance -= quantity;
                await assetUsd.save();
                await assetCoin.save();

                res.send({ price, quantity }).status(201);
            } catch (err) {
                return res.json({ error: err.name }).status(400);
            }
        }
    }
});

app.listen(port, () => {
    console.log(`listening at port: ${port}...`);
});
