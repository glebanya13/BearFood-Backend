const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const jwt = require("jsonwebtoken");

const { User, Account, Seller } = require("../models");

const transporter = nodemailer.createTransport(
    sendgridTransport({
        auth: {
            api_key: process.env.SENDGRID_KEY,
        },
    })
);

exports.signupUser = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error("Validation Failed, Incorrect data entered.");
        error.statusCode = 422;
        error.errors = errors.array();
        throw error;
    }

    const email = req.body.email;
    const firstName = req.body.firstName;
    const password = req.body.password;
    const lastName = req.body.lastName;
    const role = req.body.role;
    let token;

    if (role !== "ROLE_USER") {
        const error = new Error("Signing up an user should have a role of ROLE_USER");
        error.statusCode = 500;
        throw error;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        token = crypto.randomBytes(32).toString("hex");

        const savedAccount = await Account.create({
            role: role,
            email: email,
            password: hashedPassword,
            accountVerifyToken: token,
            accountVerifyTokenExpiration: Date.now() + 3600000,
        });

        const savedUser = await User.create({
            firstName: firstName,
            lastName: lastName,
            account: savedAccount,
        });

        transporter.sendMail({
            to: email,
            from: "YOUR_SENDGRID_VERIFIED_EMAIL",
            subject: "Verify your Account on FoodHub",
            html: `
        <p>Please verify your email by clicking on the link below - FoodHub</p>
        <p>Click this <a href="http://localhost:3002/auth/verify/${token}">link</a> to verify your account.</p>
      `,
        });

        res.status(201).json({
            message: "User signed-up successfully, please verify your email before logging in.",
            userId: savedUser._id,
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.verifyAccount = async (req, res, next) => {
    const token = req.params.token;

    try {
        const account = await Account.findOne({
            accountVerifyToken: token,
            accountVerifyTokenExpiration: { $gt: Date.now() },
        });

        if (!account) {
            const error = new Error("Token in the url is tempered, don't try to fool me!");
            error.statusCode = 403;
            throw error;
        }

        account.isVerified = true;
        account.accountVerifyToken = undefined;
        account.accountVerifyTokenExpiration = undefined;

        const updatedAccount = await account.save();
        res.json({ message: "Account verified successfully." });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    try {
        const account = await Account.findOne({ email: email });

        if (!account) {
            const error = new Error("Invalid email/password combination.");
            error.statusCode = 401;
            throw error;
        }

        loadedUser = account;
        const isEqual = await bcrypt.compare(password, account.password);

        if (!isEqual) {
            const error = new Error("Invalid email/password combination.");
            error.statusCode = 401;
            throw error;
        }

        if (loadedUser.isVerified === false) {
            const error = new Error("Verify your email before accessing the platform.");
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign(
            { accountId: loadedUser._id.toString() },
            "supersecretkey-foodWebApp",
            { expiresIn: "10h" }
        );

        res.status(200).json({ message: "Logged-in successfully", token: token });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.signupSeller = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error("Validation Failed, Incorrect data entered.");
        error.statusCode = 422;
        error.errors = errors.array();
        throw error;
    }

    if (req.files.length === 0) {
        const error = new Error("Upload an image as well.");
        error.statusCode = 422;
        throw error;
    }

    const arrayFiles = req.files.map((file) => file.path);
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const tags = req.body.tags;
    const role = req.body.role;
    const payment = req.body.payment;
    const paymentArray = payment.split(" ");
    const minOrderAmount = req.body.minOrderAmount;
    const costForOne = req.body.costForOne;
    const phoneNo = req.body.phoneNo;
    const street = req.body.street;
    const aptName = req.body.aptName;
    const formattedAddress = req.body.formattedAddress;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const locality = req.body.locality;
    const zip = req.body.zip;

    let token;

    if (role !== "ROLE_SELLER") {
        const error = new Error("Signing up a seller should have a role of ROLE_SELLER");
        error.statusCode = 500;
        throw error;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        token = crypto.randomBytes(32).toString("hex");

        const savedAccount = await Account.create({
            role: role,
            email: email,
            password: hashedPassword,
            accountVerifyToken: token,
            accountVerifyTokenExpiration: Date.now() + 3600000,
        });

        const savedSeller = await Seller.create({
            name: name,
            tags: tags,
            imageUrl: arrayFiles,
            minOrderAmount: minOrderAmount,
            costForOne: costForOne,
            account: savedAccount,
            payment: paymentArray,
            formattedAddress: formattedAddress,
            address: {
                street: street,
                zip: zip,
                phoneNo: phoneNo,
                locality: locality,
                aptName: aptName,
                lat: lat,
                lng: lng,
            },
        });

        transporter.sendMail({
            to: email,
            from: "YOUR_SENDGRID_VERIFIED_EMAIL",
            subject: "Verify your Account on FoodHub",
            html: `
        <p>Please verify your email by clicking on the link below - FoodHub</p>
        <p>Click this <a href="https://bear-food-backend.vercel.app/auth/verify/${token}">link</a> to verify your account.</p>
      `,
        });

        res.status(201).json({
            message: "Seller signed-up successfully, please verify your email before logging in.",
            sellerId: savedSeller._id,
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.imagesTest = (req, res, next) => {
    if (!req.files) {
        const error = new Error("Upload an image as well.");
        error.statusCode = 422;
        throw error;
    }

    const arrayFiles = req.files.map((file) => file.path);
    console.log(arrayFiles);

    res.status(200).json({ message: "success" });
};