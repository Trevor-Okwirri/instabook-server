const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const userRoutes = require("./routes/userRoutes");
const deviceInfoMiddleware = require("./middleware/deviceInfo");
const http = require("http");
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cors());
app.use(helmet());
app.use(deviceInfoMiddleware.captureDeviceInfo);


// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.use("/users", userRoutes);
// Connect to MongoDB
mongoose.connect("mongodb+srv://trevorokwirri:trevor%401234@anonymous-justice.eppsouf.mongodb.net/?retryWrites=true&w=majority/instabook", {
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