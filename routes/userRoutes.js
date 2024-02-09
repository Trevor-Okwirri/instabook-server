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
      return res.render("verification-success", { userEmail });
    }

    // Mark the user as verified
    user.isEmailVerified = true;
    await user.save();

    // Render the success EJS template with animation and "HURU" standing out
    const userEmail = user.email;
    res.render("verification-success", { userEmail });
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
    return res.render("invalid-token");
  }
  // Find the user by email from the token
  const user = await User.findOne({
    email: decodedToken.email,
    resetToken,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.render("invalid-token");
  }

  res.render("reset-password", { resetToken, error: "" });
});

// Route to handle password reset
router.post("/reset-password/:resetToken", async (req, res) => {
  const resetToken = req.params.resetToken;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;

  const decodedToken = validateResetToken(resetToken);

  if (!decodedToken) {
    return res.render("invalid-token");
  }

  // Find the user by email from the token
  const user = await User.findOne({
    email: decodedToken.email,
    resetToken,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.render("invalid-token");
  }

  try {
    if (newPassword !== confirmPassword) {
      return res.render("reset-password", {
        resetToken,
        error: "Passwords do not match.",
      });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.render("password-reset-success");
  } catch (error) {
    console.error(error);
    res.render("reset-password", {
      resetToken,
      error: "An error occurred. Please try again.",
    });
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
