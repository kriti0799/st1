const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let currentDirectory = path.join(__dirname);
app.use(express.static(currentDirectory));

// Define MongoDB schema for email and OTP
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    oneTimePassword: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        expires: 300, // OTP expires after 5 minutes
        default: Date.now
    }
});

// Create Mongoose model for email and OTP
const Email = mongoose.model('Email', emailSchema);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Function to generate a random OTP
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 8999).toString();
};

// Route handler for sending OTP
app.post('/generate', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email address is required", success: false });
    }
    const OTP = generateOTP();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "One Time Password (OTP)",
        text: `Your OTP is: ${OTP}`
    };

    transporter.sendMail(mailOptions, async function (err, info) {
        if (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to send OTP", success: false });
        } else {
            console.log('OTP sent successfully!!');
            
            try {
                await Email.create({ email, oneTimePassword: OTP });
                res.status(200).json({ message: "OTP sent successfully", success: true });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to save OTP to database", success: false });
            }
        }
    });
});

// Route handler for verifying OTP
app.post('/verify', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).send("Email and OTP are required");
    }

    try {
        const storedEmail = await Email.findOne({ email, oneTimePassword: otp });
        if (storedEmail) {
           
            return res.status(200).send("OTP verified successfully");
            
        } else {
            return res.status(400).send("Invalid email or OTP");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});



// Serve HTML pages
app.get('/generate', (req, res) => {
    res.sendFile(path.join(currentDirectory, 'generate.html'));
});

app.get('/verify', (req, res) => {
    res.sendFile(path.join(currentDirectory, 'verify.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});






