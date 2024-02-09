const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const http = require("http");
const app = express();

// Middleware
app.set("view engine", "ejs");
app.use(cors());
app.use(express.json());


// Routes
app.get("/", (req, res) => {
  res.send(`
  <!-- views/index.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Instabook</title>
  <style>
    body {
      background-color: #3498db;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      text-align: center;
      margin: 20px;
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    p {
      font-size: 1.2em;
      margin-bottom: 20px;
    }

    button {
      background-color: #2ecc71;
      color: white;
      padding: 15px 30px;
      font-size: 1.2em;
      border: none;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    button:hover {
      background-color: #27ae60;
    }

    .features {
      display: flex;
      flex-wrap: wrap; /* Allow features to wrap to the next line on smaller screens */
      justify-content: space-around;
      margin-top: 20px;
    }

    .feature {
      flex: 1;
      padding: 20px;
      background-color: #2c3e50;
      border-radius: 10px;
      margin: 10px;
    }

    .feature h2 {
      font-size: 1.5em;
      margin-bottom: 10px;
    }

    .cta {
      margin-top: 20px;
      font-size: 1.2em;
    }

    /* Media queries for responsiveness */
    @media (max-width: 600px) {
      .features {
        flex-direction: column; /* Stack features vertically on small screens */
      }

      .feature {
        width: 100%; /* Make features take full width on small screens */
        margin: 10px 0;
      }
    }
    
  </style>
</head>
<body>
  <h1>Welcome to InstaBook</h1>
  <p>Your social media experience redefined.</p>

  <button id="exploreButton">Explore Instabook</button>

  <div class="features">
    <div class="feature">
      <h2>Connect with Friends</h2>
      <p>Build meaningful connections with your friends and stay updated on their activities.</p>
    </div>

    <div class="feature">
      <h2>Share Moments</h2>
      <p>Capture and share your favorite moments with photos and videos to express yourself.</p>
    </div>
    <div class="feature">
      <h2>Create Groups</h2>
      <p>Form or join groups based on your interests, making it easy to connect with like-minded individuals.</p>
    </div>

    <div class="feature">
      <h2>Personalized Feeds</h2>
      <p>Experience a tailored feed that showcases content you love, keeping you engaged and informed.</p>
    </div>

    <div class="feature">
      <h2>Event Planning</h2>
      <p>Coordinate events with friends seamlessly, from casual hangouts to large gatherings, all in one place.</p>
    </div>
    <div class="feature">
      <h2>Discover Content</h2>
      <p>Explore a variety of content, including articles, photos, and videos tailored just for you.</p>
    </div>
  </div>

  <p class="cta">Join Instabook today and start connecting in a whole new way!</p>

  <script>
    document.getElementById('exploreButton').addEventListener('click', function() {
      alert('Exploring Instabook! 🚀');
    });
  </script>
</body>
</html>

  `);
});

app.use("/users", userRoutes);
// Connect to MongoDB
mongoose.connect("mongodb+srv://trevorokwirri:trevor%401234@anonymous-justice.eppsouf.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

// Socket.IO connection handling
const server = http.createServer(app);

// Start the server with Socket.IO
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
