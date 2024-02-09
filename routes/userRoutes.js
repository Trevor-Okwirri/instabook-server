// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const config = require("../config"); // Ensure the correct path to your configuration file
const User = require("../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");
const bcrypt = require("bcrypt");
const ResetToken = require("../models/ResetToken");

// Function to generate a verification token
const generateVerificationToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
  };

  const token = jwt.sign(payload, config.secretKey, { expiresIn: "1 day" }); // Adjust the expiration time as needed

  return token;
};

const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
  };

  const token = jwt.sign(payload, config.secretKey); // Adjust the expiration time as needed

  return token;
};

const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), config.secretKey);
    // Fetch the user from the database based on the decoded information
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Attach the user object to the request
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }
};


router.post('/registerwithemail', async (req, res) => {
  try {
    const { username, email, password, phoneNumber, profilePicUrl } = req.body;

    // Check if the required fields are provided
    if (!username || !email || !password || !phoneNumber) {
      return res
        .status(400)
        .json({ error: 'Username, email, password, and phone number are required' });
    }
    // Check if the username is already in use
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(401).json({ error: "Username already in use" });
    }
    // Check if the email is already in use
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(402).json({ error: 'Email already in use' });
    }

    // Check if the phone number is already in use
    const existingPhoneNumber = await User.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.status(403).json({ error: 'Phone number already in use' });
    }


    const newUser = new User({ username, email, password, phoneNumber, profilePicUrl, isEmailVerified: true});
    await newUser.save();

    res.status(200).json({
      message:
        'User registered successfully.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/registerwithoutemail', async (req, res) => {
  try {
    const { username, email, password, phoneNumber, profilePicUrl } = req.body;

    // Check if the required fields are provided
    if (!username || !email || !password || !phoneNumber) {
      return res
        .status(400)
        .json({ error: 'Username, email, password, and phone number are required' });
    }
// Check if the username is already in use
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(401).json({ error: "Username already in use" });
    }
    // Check if the email is already in use
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(402).json({ error: 'Email already in use' });
    }

    // Check if the phone number is already in use
    const existingPhoneNumber = await User.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.status(403).json({ error: 'Phone number already in use' });
    }


    const newUser = new User({ username, email, password, phoneNumber, profilePicUrl});
    await newUser.save();

    // Generate a verification token
    const verificationToken = generateVerificationToken(newUser);

    // Send verification email
    sendVerificationEmail(newUser.email, verificationToken);

    res.status(200).json({
      message:
        'User registered successfully. VErification email has been sent. Click link to verify your email',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post("/check/email", async(req, res) => {
  try {
    const email = req.body.email;
    // Check if the required fields are provided
    if (!email) {
      return res
        .status(400)
        .json({ error:"Email is required" });
    }
     // Check if the username is already in use
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(401).json({ error: 'Email already in use' });
    }
    res.status(200).json({ message: 'Email available' });
  } catch (error) {
    res.status(500).json({error : error});
  }
})
router.post("/check/phone", async(req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber;
     // Check if the username is already in use
    const existingPhoneNumber = await User.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.status(401).json({ error: 'Phone number already in use' });
    }
    res.status(200).json({ message: 'Phone number available' });
  } catch (error) {
    res.status(500).json({error : error});
  }
})

router.post("/check/username", async(req, res) => {
  try {
    const username = req.body.username;
     // Check if the username is already in use
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(401).json({ error: 'Username already in use' });
    }
    res.status(200).json({ message: 'Username available' });
  } catch (error) {
    res.status(500).json({error : error});
  }
})

// Get user profile route (requires authentication)
router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    // Extract user from the token (provided by the authenticateJWT middleware)
    const user = req.user;

    // Fetch user profile from the database (exclude sensitive information)
    const userProfile = await User.findById(user.userId).select(
      "-password "
    );

    // Check if the user profile exists
    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Send the user profile as a JSON response
    res.json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Get all users route (requires authentication)
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    // Extract user from the token (provided by the authenticateJWT middleware)
    const requester = req.user;

    // Fetch non-admin users from the database (exclude sensitive information)
    const nonAdminUsers = await User.find().select("-password -email");
    res.json(nonAdminUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Verification route
router.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;

    // Verify the token
    const decoded = jwt.verify(token, config.secretKey);

    // Find the user by id from the token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is already verified
    if (user.isEmailVerified) {
      // If already verified, render the success EJS template
      const userEmail = user.email;
      return res.send(`<!-- views/verification-success.ejs -->

      <!DOCTYPE html>
      <html lang="en">
      
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Already Verified</title>
          <style>
              body {
                  font-family: 'Arial', sans-serif;
                  text-align: center;
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  overflow: hidden;
                  background-color: rgba(20, 22, 26, 0.9);
                  color: #fff;
              }
      
              .container {
                  position: relative;
                  background-color: rgba(255, 255, 255, 0.1);
                  border-radius: 15px;
                  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
                  padding: 30px;
                  text-align: center;
                  animation: fadeIn 0.8s ease-in-out, jumpAnimation 0.5s ease-in-out infinite;
                  max-width: 400px;
                  width: 100%;
                  transform-style: preserve-3d;
                  backdrop-filter: blur(10px);
              }
      
              h1 {
                  color: #4CAF50;
                  font-size: 2em;
                  margin-top: 20px;
              }
      
              p {
                  color: #333;
                  font-size: 1.2em;
              }
      
              .verification-success {
                  font-size: 1.5em;
                  font-weight: bold;
                  color: #e44d26;
                  /* Orange */
                  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                  animation: pulseAnimation 2s ease-in-out infinite;
              }
      
              .huru-message {
                  font-size: 1.2em;
                  color: #e44d26;
                  /* Orange */
                  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
              }
      
              @keyframes pulseAnimation {
                  0% {
                      transform: scale(1);
                  }
      
                  50% {
                      transform: scale(1.1);
                  }
      
                  100% {
                      transform: scale(1);
                  }
              }
      
              @keyframes jumpAnimation {
      
                  0%,
                  20%,
                  50%,
                  80%,
                  100% {
                      transform: translateY(0);
                  }
      
                  40% {
                      transform: translateY(-10px);
                  }
      
                  60% {
                      transform: translateY(-5px);
                  }
              }
      
              @keyframes fadeIn {
                  from {
                      opacity: 0;
                      transform: translateY(-20px);
                  }
      
                  to {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
          </style>
      </head>
      
      <body>
          <div class="container">
              <h1>Email Already Verified!</h1>
              <p>Your email (<span class="verification-success">
                      ${userEmail}
                  </span>) has already been verified.</p>
              <p class="huru-message">Welcome to <span class="verification-success">Insta</span>Book!</p>
          </div>
      </body>
      
      </html>`);
    }

    // Mark the user as verified
    user.isEmailVerified = true;
    await user.save();

    // Render the success EJS template with animation and "HURU" standing out
    const userEmail = user.email;
    res.send(`<!-- views/verification-success.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Already Verified</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                text-align: center;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                overflow: hidden;
                background-color: rgba(20, 22, 26, 0.9);
                color: #fff;
            }
    
            .container {
                position: relative;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out, jumpAnimation 0.5s ease-in-out infinite;
                max-width: 400px;
                width: 100%;
                transform-style: preserve-3d;
                backdrop-filter: blur(10px);
            }
    
            h1 {
                color: #4CAF50;
                font-size: 2em;
                margin-top: 20px;
            }
    
            p {
                color: #333;
                font-size: 1.2em;
            }
    
            .verification-success {
                font-size: 1.5em;
                font-weight: bold;
                color: #e44d26;
                /* Orange */
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                animation: pulseAnimation 2s ease-in-out infinite;
            }
    
            .huru-message {
                font-size: 1.2em;
                color: #e44d26;
                /* Orange */
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }
    
            @keyframes pulseAnimation {
                0% {
                    transform: scale(1);
                }
    
                50% {
                    transform: scale(1.1);
                }
    
                100% {
                    transform: scale(1);
                }
            }
    
            @keyframes jumpAnimation {
    
                0%,
                20%,
                50%,
                80%,
                100% {
                    transform: translateY(0);
                }
    
                40% {
                    transform: translateY(-10px);
                }
    
                60% {
                    transform: translateY(-5px);
                }
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1>Email Already Verified!</h1>
            <p>Your email (<span class="verification-success">
                    ${userEmail}
                </span>) has already been verified.</p>
            <p class="huru-message">Welcome to <span class="verification-success">Insta</span>Book!</p>
        </div>
    </body>
    
    </html>`);
  } catch (error) {
    console.error(error);
    // Render the error EJS template with a shaking animation
    const errorMessage = "Invalid or expired token";
    res.status(401).render("verification-error", { errorMessage });
  }
});
// Middleware to check if reset token is valid and not expired
const validateResetToken = (resetToken) => {
  try {
    const decodedToken = jwt.verify(resetToken, config.secretKey);
    return decodedToken;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Route to render the reset password page
router.get("/reset-password/:resetToken", async (req, res) => {
  const resetToken = req.params.resetToken;
  const decodedToken = validateResetToken(resetToken);

  if (!decodedToken) {
    return res.send(`<!-- views/invalid-token.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body {
                background-color: #1a1a1a;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
    
            .container {
                background-color: #292929;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out;
                max-width: 400px;
                width: 100%;
            }
    
            h1 {
                color: #e44d26;
                font-size: 2.5em;
                margin-bottom: 20px;
                animation: titleFadeIn 1s ease-in-out;
            }
    
            .welcome-text {
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 10px;
            }
    
            .chat-app-name {
                font-weight: bold;
                color: #e44d26;
                font-size: 1.3em;
                transition: color 0.5s ease-in-out;
            }
    
            p {
                color: #ccc;
                font-size: 1.1em;
                line-height: 1.5;
            }
    
            a {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease-in-out;
            }
    
            a:hover {
                background-color: #d0371a;
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes titleFadeIn {
                from {
                    opacity: 0;
                }
    
                to {
                    opacity: 1;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1><span class="welcome-text">Welcome to</span> <span class="chat-app-name">HuruChat</span></h1>
            <p>The password reset token is either invalid or has expired.</p>
            <p>Please make sure you are using the correct link or initiate a new password reset.</p>
        </div>
    </body>
    
    </html>`);
  }
  // Find the user by email from the token
  const user = await User.findOne({
    email: decodedToken.email,
    resetToken,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {const errorHTML = error ? `<div class="error-message">${error}</div>` : '';
    return res.send(`<!-- views/invalid-token.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body {
                background-color: #1a1a1a;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
    
            .container {
                background-color: #292929;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out;
                max-width: 400px;
                width: 100%;
            }
    
            h1 {
                color: #e44d26;
                font-size: 2.5em;
                margin-bottom: 20px;
                animation: titleFadeIn 1s ease-in-out;
            }
    
            .welcome-text {
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 10px;
            }
    
            .chat-app-name {
                font-weight: bold;
                color: #e44d26;
                font-size: 1.3em;
                transition: color 0.5s ease-in-out;
            }
    
            p {
                color: #ccc;
                font-size: 1.1em;
                line-height: 1.5;
            }
    
            a {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease-in-out;
            }
    
            a:hover {
                background-color: #d0371a;
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes titleFadeIn {
                from {
                    opacity: 0;
                }
    
                to {
                    opacity: 1;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1><span class="welcome-text">Welcome to</span> <span class="chat-app-name">Instabook</span></h1>
            <p>The password reset token is either invalid or has expired.</p>
            <p>Please make sure you are using the correct link or initiate a new password reset.</p>
        </div>
    </body>
    
    </html>`);
  }

  res.send(`<!DOCTYPE html>
  <html lang="en">
  
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
          body {
              background: #14161a;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              overflow: hidden;
              color: #fff;
          }
  
          .container {
              position: relative;
              background-color: rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
              padding: 30px;
              text-align: center;
              animation: fadeIn 0.8s ease-in-out, rotateCard 30s linear infinite;
              max-width: 800px;
              width: 100%;
              transform-style: preserve-3d;
              backdrop-filter: blur(10px);
              display: flex;
              flex-direction: column;
              align-items: center;
          }
  
          .left-column,
          .right-column {
              text-align: center;
              margin-bottom: 20px;
          }
  
          .left-column {
              order: 2;
          }
  
          .right-column {
              order: 1;
          }
  
          .chat-app-name {
              font-weight: bold;
              font-size: 2em;
              transition: color 0.5s ease-in-out;
          }
  
          .chat-app-name span {
              display: inline-block;
              animation: pulsateRainbow 3s ease-in-out infinite;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
  
          p {
              font-size: 1.3em;
              line-height: 1.5;
          }
  
          h2 {
              color: #fff;
              font-size: 2em;
          }
  
          form {
              width: 100%;
              max-width: 400px;
              margin: 0 auto;
              display: grid;
              grid-template-rows: repeat(3, auto);
              grid-gap: 20px;
          }
  
          label {
              font-size: 1.3em;
              margin-bottom: 8px;
          }
  
          input {
              padding: 15px;
              width: 100%;
              box-sizing: border-box;
              border: 2px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              transition: border-color 0.3s ease-in-out;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
          }
  
          input:focus {
              border-color: #e44d26;
          }
  
          button {
              padding: 15px 30px;
              background-color: #e44d26;
              color: #fff;
              text-decoration: none;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              transition: background-color 0.3s ease-in-out;
          }
  
          button:hover {
              background-color: #d0371a;
          }
  
          a {
              margin-top: 20px;
              color: #e44d26;
              text-decoration: none;
              font-size: 1.2em;
              transition: color 0.3s ease-in-out;
          }
  
          a:hover {
              color: #b5341d;
          }
  
          .password-container {
              position: relative;
          }
  
          .password-container i {
              position: absolute;
              top: 50%;
              right: 10px;
              transform: translateY(-50%);
              cursor: pointer;
          }
  
          .rotate-stop {
              animation: none !important;
          }
  
          .error-message {
              color: #ff3333;
              margin-top: 10px;
              font-size: 1.2em;
          }
  
          @media (min-width: 768px) {
              .container {
                  flex-direction: row;
              }
  
              .left-column,
              .right-column {
                  text-align: left;
                  margin-bottom: 0;
              }
  
              .left-column {
                  order: 1;
                  flex: 1;
              }
  
              .right-column {
                  order: 2;
                  flex: 1;
              }
  
              .chat-app-name {
                  font-size: 3em;
              }
  
              h2 {
                  font-size: 2.5em;
              }
          }
  
          @keyframes fadeIn {
              from {
                  opacity: 0;
                  transform: translateY(-20px);
              }
  
              to {
                  opacity: 1;
                  transform: translateY(0);
              }
          }
  
          @keyframes rotateCard {
              0% {
                  transform: rotateY(0deg);
              }
  
              25% {
                  transform: rotateY(60deg);
              }
  
              50% {
                  transform: rotateY(0deg);
              }
  
              75% {
                  transform: rotateY(-50deg);
              }
  
              100% {
                  transform: rotateY(0deg);
              }
          }
  
          @keyframes pulsateRainbow {
              0% {
                  color: #e44d26;
              }
  
              10% {
                  color: #ff0000;
              }
  
              20% {
                  color: #ffae00;
              }
  
              30% {
                  color: #00ff00;
              }
  
              40% {
                  color: #ffea00;
              }
  
              50% {
                  color: #0000ff;
              }
  
              60% {
                  color: #8bc34a;
              }
  
              70% {
                  color: #ff00ff;
              }
  
              80% {
                  color: #2196f3;
              }
  
              90% {
                  color: #00ffff;
              }
  
              100% {
                  color: #e44d26;
              }
          }
      </style>
  </head>
  
  <body>
      <div class="container" id="cardContainer">
          <div class="left-column">
              <h1><span class="chat-app-name"><span>H</span><span>u</span><span>r</span><span>u</span></span></h1>
              <p>Enter and confirm your new password.</p>
          </div>
          <div class="right-column">
              <h2>Reset Password</h2>
              <form id="resetPasswordForm" method="post" onsubmit="return validatePasswords()">
                  <label for="newPassword">New Password</label>
                  <div class="password-container">
                      <input type="password" id="newPassword" name="newPassword" required
                          onfocus="stopRotation('newPassword')">
                      <i class="toggle-password" onclick="togglePassword('newPassword')">👁️</i>
                  </div>
  
                  <label for="confirmPassword">Confirm Password</label>
                  <div class="password-container">
                      <input type="password" id="confirmPassword" name="confirmPassword" required
                          onfocus="stopRotation('confirmPassword')">
                      <i class="toggle-password" onclick="togglePassword('confirmPassword')">👁️</i>
                  </div>
  
                      ${errorHTML}
                          <button type="submit">Reset Password</button>
              </form>
          </div>
      </div>
  
      <script>
          document.addEventListener('DOMContentLoaded', function () {
              const resetToken = window.location.pathname.split('/').pop();
              const form = document.getElementById('resetPasswordForm');
              form.action = "/users/reset-password/${resetToken}";
          });
  
          function stopRotation(elementId) {
              document.getElementById("cardContainer").classList.add("rotate-stop");
              document.getElementById(elementId).addEventListener("blur", function () {
                  document.getElementById("cardContainer").classList.remove("rotate-stop");
              });
          }
  
          function validatePasswords() {
              var newPassword = document.getElementById("newPassword").value;
              var confirmPassword = document.getElementById("confirmPassword").value;
  
              if (newPassword !== confirmPassword) {
                  showError("Passwords do not match. Please enter matching passwords.");
                  return false; // Prevent form submission
              }
  
              return true; // Allow form submission
          }
  
          function togglePassword(elementId) {
              var passwordInput = document.getElementById(elementId);
              passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
          }
  
          function showError(message) {
              var errorContainer = document.createElement("div");
              errorContainer.className = "error-message";
              errorContainer.textContent = message;
  
              var form = document.getElementById('resetPasswordForm');
              form.appendChild(errorContainer);
          }
      </script>
  </body>
  
  </html>`, { resetToken, error: "" });
});

// Route to handle password reset
router.post("/reset-password/:resetToken", async (req, res) => {
  const resetToken = req.params.resetToken;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;

  const decodedToken = validateResetToken(resetToken);

  if (!decodedToken) {
    return res.send(`<!-- views/invalid-token.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body {
                background-color: #1a1a1a;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
    
            .container {
                background-color: #292929;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out;
                max-width: 400px;
                width: 100%;
            }
    
            h1 {
                color: #e44d26;
                font-size: 2.5em;
                margin-bottom: 20px;
                animation: titleFadeIn 1s ease-in-out;
            }
    
            .welcome-text {
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 10px;
            }
    
            .chat-app-name {
                font-weight: bold;
                color: #e44d26;
                font-size: 1.3em;
                transition: color 0.5s ease-in-out;
            }
    
            p {
                color: #ccc;
                font-size: 1.1em;
                line-height: 1.5;
            }
    
            a {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease-in-out;
            }
    
            a:hover {
                background-color: #d0371a;
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes titleFadeIn {
                from {
                    opacity: 0;
                }
    
                to {
                    opacity: 1;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1><span class="welcome-text">Welcome to</span> <span class="chat-app-name">HuruChat</span></h1>
            <p>The password reset token is either invalid or has expired.</p>
            <p>Please make sure you are using the correct link or initiate a new password reset.</p>
        </div>
    </body>
    
    </html>`);
  }

  // Find the user by email from the token
  const user = await User.findOne({
    email: decodedToken.email,
    resetToken,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.send(`<!-- views/invalid-token.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body {
                background-color: #1a1a1a;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
    
            .container {
                background-color: #292929;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out;
                max-width: 400px;
                width: 100%;
            }
    
            h1 {
                color: #e44d26;
                font-size: 2.5em;
                margin-bottom: 20px;
                animation: titleFadeIn 1s ease-in-out;
            }
    
            .welcome-text {
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 10px;
            }
    
            .chat-app-name {
                font-weight: bold;
                color: #e44d26;
                font-size: 1.3em;
                transition: color 0.5s ease-in-out;
            }
    
            p {
                color: #ccc;
                font-size: 1.1em;
                line-height: 1.5;
            }
    
            a {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease-in-out;
            }
    
            a:hover {
                background-color: #d0371a;
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes titleFadeIn {
                from {
                    opacity: 0;
                }
    
                to {
                    opacity: 1;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1><span class="welcome-text">Welcome to</span> <span class="chat-app-name">HuruChat</span></h1>
            <p>The password reset token is either invalid or has expired.</p>
            <p>Please make sure you are using the correct link or initiate a new password reset.</p>
        </div>
    </body>
    
    </html>`);
  }

  try {
    if (newPassword !== confirmPassword) {
      return res.send(`<!DOCTYPE html>
      <html lang="en">
      
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
          <style>
              body {
                  background: #14161a;
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  overflow: hidden;
                  color: #fff;
              }
      
              .container {
                  position: relative;
                  background-color: rgba(255, 255, 255, 0.1);
                  border-radius: 15px;
                  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
                  padding: 30px;
                  text-align: center;
                  animation: fadeIn 0.8s ease-in-out, rotateCard 30s linear infinite;
                  max-width: 800px;
                  width: 100%;
                  transform-style: preserve-3d;
                  backdrop-filter: blur(10px);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
              }
      
              .left-column,
              .right-column {
                  text-align: center;
                  margin-bottom: 20px;
              }
      
              .left-column {
                  order: 2;
              }
      
              .right-column {
                  order: 1;
              }
      
              .chat-app-name {
                  font-weight: bold;
                  font-size: 2em;
                  transition: color 0.5s ease-in-out;
              }
      
              .chat-app-name span {
                  display: inline-block;
                  animation: pulsateRainbow 3s ease-in-out infinite;
                  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
              }
      
              p {
                  font-size: 1.3em;
                  line-height: 1.5;
              }
      
              h2 {
                  color: #fff;
                  font-size: 2em;
              }
      
              form {
                  width: 100%;
                  max-width: 400px;
                  margin: 0 auto;
                  display: grid;
                  grid-template-rows: repeat(3, auto);
                  grid-gap: 20px;
              }
      
              label {
                  font-size: 1.3em;
                  margin-bottom: 8px;
              }
      
              input {
                  padding: 15px;
                  width: 100%;
                  box-sizing: border-box;
                  border: 2px solid rgba(255, 255, 255, 0.1);
                  border-radius: 8px;
                  transition: border-color 0.3s ease-in-out;
                  background: rgba(255, 255, 255, 0.1);
                  color: #fff;
              }
      
              input:focus {
                  border-color: #e44d26;
              }
      
              button {
                  padding: 15px 30px;
                  background-color: #e44d26;
                  color: #fff;
                  text-decoration: none;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: background-color 0.3s ease-in-out;
              }
      
              button:hover {
                  background-color: #d0371a;
              }
      
              a {
                  margin-top: 20px;
                  color: #e44d26;
                  text-decoration: none;
                  font-size: 1.2em;
                  transition: color 0.3s ease-in-out;
              }
      
              a:hover {
                  color: #b5341d;
              }
      
              .password-container {
                  position: relative;
              }
      
              .password-container i {
                  position: absolute;
                  top: 50%;
                  right: 10px;
                  transform: translateY(-50%);
                  cursor: pointer;
              }
      
              .rotate-stop {
                  animation: none !important;
              }
      
              .error-message {
                  color: #ff3333;
                  margin-top: 10px;
                  font-size: 1.2em;
              }
      
              @media (min-width: 768px) {
                  .container {
                      flex-direction: row;
                  }
      
                  .left-column,
                  .right-column {
                      text-align: left;
                      margin-bottom: 0;
                  }
      
                  .left-column {
                      order: 1;
                      flex: 1;
                  }
      
                  .right-column {
                      order: 2;
                      flex: 1;
                  }
      
                  .chat-app-name {
                      font-size: 3em;
                  }
      
                  h2 {
                      font-size: 2.5em;
                  }
              }
      
              @keyframes fadeIn {
                  from {
                      opacity: 0;
                      transform: translateY(-20px);
                  }
      
                  to {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
      
              @keyframes rotateCard {
                  0% {
                      transform: rotateY(0deg);
                  }
      
                  25% {
                      transform: rotateY(60deg);
                  }
      
                  50% {
                      transform: rotateY(0deg);
                  }
      
                  75% {
                      transform: rotateY(-50deg);
                  }
      
                  100% {
                      transform: rotateY(0deg);
                  }
              }
      
              @keyframes pulsateRainbow {
                  0% {
                      color: #e44d26;
                  }
      
                  10% {
                      color: #ff0000;
                  }
      
                  20% {
                      color: #ffae00;
                  }
      
                  30% {
                      color: #00ff00;
                  }
      
                  40% {
                      color: #ffea00;
                  }
      
                  50% {
                      color: #0000ff;
                  }
      
                  60% {
                      color: #8bc34a;
                  }
      
                  70% {
                      color: #ff00ff;
                  }
      
                  80% {
                      color: #2196f3;
                  }
      
                  90% {
                      color: #00ffff;
                  }
      
                  100% {
                      color: #e44d26;
                  }
              }
          </style>
      </head>
      
      <body>
          <div class="container" id="cardContainer">
              <div class="left-column">
                  <h1><span class="chat-app-name"><span>H</span><span>u</span><span>r</span><span>u</span></span></h1>
                  <p>Enter and confirm your new password.</p>
              </div>
              <div class="right-column">
                  <h2>Reset Password</h2>
                  <form id="resetPasswordForm" method="post" onsubmit="return validatePasswords()">
                      <label for="newPassword">New Password</label>
                      <div class="password-container">
                          <input type="password" id="newPassword" name="newPassword" required
                              onfocus="stopRotation('newPassword')">
                          <i class="toggle-password" onclick="togglePassword('newPassword')">👁️</i>
                      </div>
      
                      <label for="confirmPassword">Confirm Password</label>
                      <div class="password-container">
                          <input type="password" id="confirmPassword" name="confirmPassword" required
                              onfocus="stopRotation('confirmPassword')">
                          <i class="toggle-password" onclick="togglePassword('confirmPassword')">👁️</i>
                      </div>
      
                          <div class="error-message">
                          Passwords do not match.
                          </div>
      
                              <button type="submit">Reset Password</button>
                  </form>
              </div>
          </div>
      
          <script>
              document.addEventListener('DOMContentLoaded', function () {
                  const resetToken = window.location.pathname.split('/').pop();
                  const form = document.getElementById('resetPasswordForm');
                  form.action = "/users/reset-password/${resetToken}";
              });
      
              function stopRotation(elementId) {
                  document.getElementById("cardContainer").classList.add("rotate-stop");
                  document.getElementById(elementId).addEventListener("blur", function () {
                      document.getElementById("cardContainer").classList.remove("rotate-stop");
                  });
              }
      
              function validatePasswords() {
                  var newPassword = document.getElementById("newPassword").value;
                  var confirmPassword = document.getElementById("confirmPassword").value;
      
                  if (newPassword !== confirmPassword) {
                      showError("Passwords do not match. Please enter matching passwords.");
                      return false; // Prevent form submission
                  }
      
                  return true; // Allow form submission
              }
      
              function togglePassword(elementId) {
                  var passwordInput = document.getElementById(elementId);
                  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
              }
      
              function showError(message) {
                  var errorContainer = document.createElement("div");
                  errorContainer.className = "error-message";
                  errorContainer.textContent = message;
      
                  var form = document.getElementById('resetPasswordForm');
                  form.appendChild(errorContainer);
              }
          </script>
      </body>
      
      </html>`);
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.send(`<!-- views/password-success.ejs -->

    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Change Success</title>
        <style>
            body {
                background: linear-gradient(to bottom right, #14161a, #2b2e39);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
    
            .container {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out, bounce 1s ease-in-out infinite, pulsate 1.5s ease-in-out infinite;
                max-width: 400px;
                width: 100%;
                backdrop-filter: blur(10px);
            }
    
            h1 {
                color: #e44d26;
                font-size: 2.5em;
                margin-bottom: 20px;
                animation: titleFadeIn 1s ease-in-out;
            }
    
            p {
                color: #ccc;
                font-size: 1.1em;
                line-height: 1.5;
            }
    
            .chat-app-name {
                font-weight: bold;
                color: #e44d26;
                font-size: 1.3em;
                transition: color 0.5s ease-in-out;
            }
    
            a {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease-in-out;
            }
    
            a:hover {
                background-color: #d0371a;
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes titleFadeIn {
                from {
                    opacity: 0;
                }
    
                to {
                    opacity: 1;
                }
            }
    
            @keyframes bounce {
    
                0%,
                20%,
                50%,
                80%,
                100% {
                    transform: translateY(0);
                }
    
                40% {
                    transform: translateY(-20px);
                }
    
                60% {
                    transform: translateY(-10px);
                }
            }
    
            @keyframes pulsate {
                0% {
                    transform: scale(1);
                }
    
                50% {
                    transform: scale(1.1);
                }
    
                100% {
                    transform: scale(1);
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1>Password Change Success</h1>
            <p>Your password has been successfully changed.</p>
            <p>Thank you for using <span class="chat-app-name">HuruChat</span>.</p>
        </div>
    </body>
    
    </html>`);
  } catch (error) {
    console.error(error);
    res.send(`<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
            body {
                background: #14161a;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                overflow: hidden;
                color: #fff;
            }
    
            .container {
                position: relative;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
                padding: 30px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out, rotateCard 30s linear infinite;
                max-width: 800px;
                width: 100%;
                transform-style: preserve-3d;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
            }
    
            .left-column,
            .right-column {
                text-align: center;
                margin-bottom: 20px;
            }
    
            .left-column {
                order: 2;
            }
    
            .right-column {
                order: 1;
            }
    
            .chat-app-name {
                font-weight: bold;
                font-size: 2em;
                transition: color 0.5s ease-in-out;
            }
    
            .chat-app-name span {
                display: inline-block;
                animation: pulsateRainbow 3s ease-in-out infinite;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }
    
            p {
                font-size: 1.3em;
                line-height: 1.5;
            }
    
            h2 {
                color: #fff;
                font-size: 2em;
            }
    
            form {
                width: 100%;
                max-width: 400px;
                margin: 0 auto;
                display: grid;
                grid-template-rows: repeat(3, auto);
                grid-gap: 20px;
            }
    
            label {
                font-size: 1.3em;
                margin-bottom: 8px;
            }
    
            input {
                padding: 15px;
                width: 100%;
                box-sizing: border-box;
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                transition: border-color 0.3s ease-in-out;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
    
            input:focus {
                border-color: #e44d26;
            }
    
            button {
                padding: 15px 30px;
                background-color: #e44d26;
                color: #fff;
                text-decoration: none;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s ease-in-out;
            }
    
            button:hover {
                background-color: #d0371a;
            }
    
            a {
                margin-top: 20px;
                color: #e44d26;
                text-decoration: none;
                font-size: 1.2em;
                transition: color 0.3s ease-in-out;
            }
    
            a:hover {
                color: #b5341d;
            }
    
            .password-container {
                position: relative;
            }
    
            .password-container i {
                position: absolute;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                cursor: pointer;
            }
    
            .rotate-stop {
                animation: none !important;
            }
    
            .error-message {
                color: #ff3333;
                margin-top: 10px;
                font-size: 1.2em;
            }
    
            @media (min-width: 768px) {
                .container {
                    flex-direction: row;
                }
    
                .left-column,
                .right-column {
                    text-align: left;
                    margin-bottom: 0;
                }
    
                .left-column {
                    order: 1;
                    flex: 1;
                }
    
                .right-column {
                    order: 2;
                    flex: 1;
                }
    
                .chat-app-name {
                    font-size: 3em;
                }
    
                h2 {
                    font-size: 2.5em;
                }
            }
    
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
    
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
    
            @keyframes rotateCard {
                0% {
                    transform: rotateY(0deg);
                }
    
                25% {
                    transform: rotateY(60deg);
                }
    
                50% {
                    transform: rotateY(0deg);
                }
    
                75% {
                    transform: rotateY(-50deg);
                }
    
                100% {
                    transform: rotateY(0deg);
                }
            }
    
            @keyframes pulsateRainbow {
                0% {
                    color: #e44d26;
                }
    
                10% {
                    color: #ff0000;
                }
    
                20% {
                    color: #ffae00;
                }
    
                30% {
                    color: #00ff00;
                }
    
                40% {
                    color: #ffea00;
                }
    
                50% {
                    color: #0000ff;
                }
    
                60% {
                    color: #8bc34a;
                }
    
                70% {
                    color: #ff00ff;
                }
    
                80% {
                    color: #2196f3;
                }
    
                90% {
                    color: #00ffff;
                }
    
                100% {
                    color: #e44d26;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="container" id="cardContainer">
            <div class="left-column">
                <h1><span class="chat-app-name"><span>H</span><span>u</span><span>r</span><span>u</span></span></h1>
                <p>Enter and confirm your new password.</p>
            </div>
            <div class="right-column">
                <h2>Reset Password</h2>
                <form id="resetPasswordForm" method="post" onsubmit="return validatePasswords()">
                    <label for="newPassword">New Password</label>
                    <div class="password-container">
                        <input type="password" id="newPassword" name="newPassword" required
                            onfocus="stopRotation('newPassword')">
                        <i class="toggle-password" onclick="togglePassword('newPassword')">👁️</i>
                    </div>
    
                    <label for="confirmPassword">Confirm Password</label>
                    <div class="password-container">
                        <input type="password" id="confirmPassword" name="confirmPassword" required
                            onfocus="stopRotation('confirmPassword')">
                        <i class="toggle-password" onclick="togglePassword('confirmPassword')">👁️</i>
                    </div>
    
                        <div class="error-message">
                        An error occurred. Please try again.
                        </div>
    
                            <button type="submit">Reset Password</button>
                </form>
            </div>
        </div>
    
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const resetToken = window.location.pathname.split('/').pop();
                const form = document.getElementById('resetPasswordForm');
                form.action = "/users/reset-password/${resetToken}";
            });
    
            function stopRotation(elementId) {
                document.getElementById("cardContainer").classList.add("rotate-stop");
                document.getElementById(elementId).addEventListener("blur", function () {
                    document.getElementById("cardContainer").classList.remove("rotate-stop");
                });
            }
    
            function validatePasswords() {
                var newPassword = document.getElementById("newPassword").value;
                var confirmPassword = document.getElementById("confirmPassword").value;
    
                if (newPassword !== confirmPassword) {
                    showError("Passwords do not match. Please enter matching passwords.");
                    return false; // Prevent form submission
                }
    
                return true; // Allow form submission
            }
    
            function togglePassword(elementId) {
                var passwordInput = document.getElementById(elementId);
                passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
            }
    
            function showError(message) {
                var errorContainer = document.createElement("div");
                errorContainer.className = "error-message";
                errorContainer.textContent = message;
    
                var form = document.getElementById('resetPasswordForm');
                form.appendChild(errorContainer);
            }
        </script>
    </body>
    
    </html>`,
    );
  }
});

// Route to initiate password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);

    const requester = await User.findOne({ email });

    // Check if the requester is an admin or the user for their own account
    if (!(requester.email === email)) {
      return res.status(403).json({
        error: "Unauthorized to initiate password reset for this account",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a password reset token with user email
    const payload = {
      email: user.email,
    };
    const resetToken = jwt.sign(payload, config.secretKey, { expiresIn: "1h" });

    // Update the user with the reset token
    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(email, resetToken);
    console.log(resetToken)
    res.json({ message: "Password reset link sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login route
router.post("/loginwithphone", async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    var user = await User.findOne({ phoneNumber: phoneNumber });

    // Check if the user exists
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if the password is correct using comparePassword method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if the email is verified
    if (!user.isEmailVerified) {
      // Generate a verification token
      const verificationToken = generateVerificationToken(user);
  
      // Send verification email
      sendVerificationEmail(user.email, verificationToken);
      return res.status(402).json({ error: "Email not verified" , email: user.email});
    }

    // Generate JWT token with user information
    const token = generateToken({
      userId: user._id,
      email: user.email,
      isAdmin: user.isAdmin, // Include isAdmin status if applicable
    });

    // Include additional user information in the response if needed
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      // Add more user data as needed
    };

    res.status(200).json({ token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/loginwithemail", async (req, res) => {
  try {
    const { email } = req.body;

    var user = await User.findOne({ email});

    // Generate JWT token with user information
    const token = generateToken({
      userId: user._id,
      email: user.email,
      isAdmin: user.isAdmin, // Include isAdmin status if applicable
    });

    // Include additional user information in the response if needed
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      // Add more user data as needed
    };

    res.json({ token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/loginwithusername", async (req, res) => {
  try {
    const { username } = req.body;

    var user = await User.findOne({ username});
    // Check if the email is verified
    if (!user.isEmailVerified) {
      return res.status(402).json({ error: "Email not verified" , email: user.email});
    }

    // Generate JWT token with user information
    const token = generateToken({
      userId: user._id,
      email: user.email,
      isAdmin: user.isAdmin, // Include isAdmin status if applicable
    });

    // Include additional user information in the response if needed
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      // Add more user data as needed
    };

    res.json({ token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update password route (requires authentication)
router.put("/update-password", authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Extract user from the token (provided by the authenticateJWT middleware)
    const loggedInUser = req.user;
    // Find the user by ID
    const existingUser = await User.findById(loggedInUser._id);

    // Check if the current password is correct
    if (!(await existingUser.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    // Update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    existingUser.password = hashedPassword;
    await existingUser.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/user/:userId", authenticateJWT, async (req, res) => {
  try {
    // Check if the authenticated user has admin privileges
    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin privileges required." });
    }

    // Find the user by ID (excluding sensitive information)
    const user = await User.findById(req.params.userId).select(
      "-password -email"
    );

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.delete("/delete-account", authenticateJWT, async (req, res) => {
  try {

    const currentUser = req.user;

    const deletedUser = await User.findByIdAndDelete(currentUser._id);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User account deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
