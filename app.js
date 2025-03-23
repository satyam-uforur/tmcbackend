var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var http = require("http");
var socketIo = require("socket.io");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Setup Socket.IO with the router
indexRouter.setupSocketIO(io);

// Set up file uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.use("/", indexRouter);
app.use("/users", usersRouter);

// Add file upload endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

// Serve static files
app.use("/uploads", express.static("uploads"));

// Add task validation endpoint
app.post("/api/validate-task-access", async (req, res) => {
  const { workerName, taskName, role } = req.body;

  // Log the received data
  console.log("Validation Request:", { workerName, taskName, role });

  // Validate required fields
  if (!workerName || !taskName) {
    return res
      .status(400)
      .json({ error: "Worker name and task name are required" });
  }

  // Use a default role if undefined
  const safeRole = role || "User";

  try {
    let task;
    const Task = mongoose.model("taskforworkers");

    if (safeRole.includes("Director")) {
      console.log("Director access granted");
      task = await Task.findOne({ task: taskName });
      if (task) {
        return res.json({
          valid: true,
          task: {
            name: task.name,
            task: task.task,
            workers: task.workers,
          },
        });
      } else {
        return res.status(404).json({ valid: false, error: "Task not found" });
      }
    } else if (safeRole.includes("Associate")) {
      // For other roles, check if assigned to the task
      task = await Task.findOne({
        task: taskName,
        workers: workerName,
      });

      if (task) {
        return res.json({
          valid: true,
          task: {
            name: task.name,
            task: task.task,
            workers: task.workers,
          },
        });
      } else {
        return res
          .status(403)
          .json({ valid: false, error: "Access denied to this task" });
      }
    } else if (safeRole.includes("TeamLead")) {
      // For other roles, check if assigned to the task
      task = await Task.findOne({
        task: taskName,
        name: workerName,
      });

      console.log("Task found:", task);

      if (task) {
        return res.json({
          valid: true,
          task: {
            name: task.name,
            task: task.task,
            workers: task.workers,
          },
        });
      } else {
        return res
          .status(403)
          .json({ valid: false, error: "Access denied to this task" });
      }
    }
  } catch (error) {
    console.error("Error validating task access:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Add task search endpoint
app.get("/api/search-tasks", async (req, res) => {
  try {
    const query = req.query.q;
    console.log("🔍 Search query received:", query);

    if (!query || query.trim() === "") {
      console.log("⚠️ Empty query string provided.");
      return res.json({ data: [] });
    }

    const tasks = await fetchTasksFromDatabase(query.trim());
    console.log(`✅ Found ${tasks.length} suggestions for query "${query}"`);
    res.json({ data: tasks });
  } catch (error) {
    console.error("❌ Error searching tasks:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Helper function for task search
const fetchTasksFromDatabase = async (query) => {
  try {
    const Task = mongoose.model("taskforworkers");
    const regex = new RegExp("^" + query, "i");
    const tasks = await Task.find({ task: regex })
      .select("task -_id")
      .limit(10); // Limit to 10 suggestions for efficiency
    return tasks.map((task) => task.task);
  } catch (error) {
    console.error("Error fetching tasks from database:", error);
    throw error;
  }
};

// Add task retrieval endpoint
app.get("/api/get-task/:taskName", async (req, res) => {
  const { taskName } = req.params;
  console.log("Get task request for:", taskName);

  try {
    const Task = mongoose.model("taskforworkers");
    const task = await Task.findOne({ task: taskName });
    if (task) {
      res.json({ task });
    } else {
      console.log("Task not found:", taskName);
      res.status(404).json({ error: "Task not found" });
    }
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Add all tasks retrieval endpoint
app.get("/api/get-all-tasks", async (req, res) => {
  try {
    const Task = mongoose.model("taskforworkers");
    const tasks = await Task.find({}, "task"); // Only fetch the 'task' field
    const taskNames = tasks.map((task) => task.task);
    res.json({ taskNames });
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Socket.IO Chat Logic
const taskRooms = new Map();
const users = {};

// Define Message schema if not already defined
let Message;
try {
  Message = mongoose.model("Message");
} catch (e) {
  const messageSchema = new mongoose.Schema({
    taskName: { type: String, required: true },
    from: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    time: String,
    fileUrl: String,
    fileName: String,
  });
  Message = mongoose.model("Message", messageSchema);
}

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log("🟢 A user connected");

  // Task-specific chat functionality
  socket.on("joinTaskRoom", async (taskName, workerName) => {
    const userRole = socket.handshake.query.role || "User";
    const isDirector = userRole.includes("Director");

    socket.username = workerName;
    socket.userRole = userRole;

    // Leave other rooms
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(taskName);
    if (!taskRooms.has(taskName)) taskRooms.set(taskName, new Set());
    taskRooms.get(taskName).add(workerName);

    // Send current users in room
    io.to(taskName).emit("roomUsers", Array.from(taskRooms.get(taskName)));

    // Log director access
    if (isDirector) {
      console.log(`Director ${workerName} joined room ${taskName}`);
    }

    try {
      const messages = await Message.find({ taskName }).sort({ timestamp: 1 });
      socket.emit("taskChatHistory", messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  });

  socket.on("taskMessage", async (data) => {
    try {
      const message = new Message({
        ...data,
        timestamp: new Date(),
        time: new Date().toLocaleTimeString(),
      });
      await message.save();
      io.to(data.taskName).emit("taskMessage", message);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // General chat functionality
  socket.on("join", async (username) => {
    users[socket.id] = username;
    console.log(`${username} has joined the chat`);

    try {
      const messages = await Message.find().sort({ timestamp: 1 });
      socket.emit("chatHistory", messages);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  });

  socket.on("message", async (data) => {
    const message = new Message({
      from: data.from,
      content: data.content,
      timestamp: new Date(),
      time: getCurrentTime(),
    });

    try {
      await message.save();
      io.emit("message", message);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    taskRooms.forEach((users, taskName) => {
      users.delete(socket.username);
      if (users.size === 0) taskRooms.delete(taskName);
    });
    delete users[socket.id];
  });
});

// Helper function for time formatting
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

module.exports = { app, server };