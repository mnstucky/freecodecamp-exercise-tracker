const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { Schema } = mongoose;
require('dotenv').config()

// Connect to DB
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => console.error(err));

// Get notifications of connection errors
mongoose.connection.on("error", console.error.bind(console, "MongoDB connection error:"));

// Create schemas and compile models
const userSchema = new Schema({
  username: {
    type: String,
    required: true
  }
});

const workoutSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    min: 1,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

const User = mongoose.model("User", userSchema);
const Workout = mongoose.model("Workout", workoutSchema);

// Load middleware
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Handle request to create new user
app.post("/api/exercise/new-user", function(req, res) {
  const newUser = req.body.username;
  User.findOne({ username: newUser }, function(err, user) {
    if (err) return console.error(err);
    if (user === null) {
      const newUserDoc = new User({
        username: newUser
      });
      newUserDoc.save(function(err, doc) {
        if (err) return console.error(err);
        res.json({
          username: newUser,
          _id: doc._id
        });
      });
    } else {
      res.send("Username already taken");
    }
  });
});

// Handle request for all users 
app.get("/api/exercise/users", function(req, res) {
  const queryForUsers = User.find({}).select("username _id");
  queryForUsers.exec(function(err, users) {
    if (err) return console.error(err);
    res.json(users);
  });
});

// Handle request to add exercise
app.post("/api/exercise/add", function(req, res) {
  const userId = req.body.userId;
  const newDescription = req.body.description;
  const newDuration = Number(req.body.duration);
  let newDate = req.body.date;
  if (!newDate) {
    newDate = undefined;
  }
  User.findOne({ _id: userId }, function(err, user) {
    if (err) return console.error(err);
    if (user === null) {
      res.send("Invalid user ID");
    } else {
      const workoutDoc = new Workout({
        username: user.username,
        date: newDate,
        duration: newDuration,
        description: newDescription
      });
      workoutDoc.save(function(err, doc) {
        if (err) return console.error(err);
        // Need to deselect __v and return date in format Tue Jan 12 2021
        res.json({
          _id: userId,
          username: doc.username,
          date: doc.date.toDateString(),
          duration: doc.duration,
          description: doc.description
        });
      });
    }
  });
})

// Handle request for user's exercise log
app.get("/api/exercise/log", function(req, res) {
  const userId = req.query.userId;
  const fromDate = req.query.from;
  const toDate = req.query.to;
  const limit = Number(req.query.limit);
  User.findOne({ _id: userId }, function(err, user) {
    if (err) return console.error(err);
    if (user === null) {
      res.send("Invalid user ID");
    } else {
      const username = user.username;
      let queryForWorkouts = Workout.find({ username: username }).select("date duration description -_id");
      queryForWorkouts = fromDate 
        ? queryForWorkouts.where("date").gt(fromDate) 
        : queryForWorkouts;
      queryForWorkouts = toDate
        ? queryForWorkouts.where("date").lt(toDate)
        : queryForWorkouts;
      queryForWorkouts = limit
        ? queryForWorkouts.limit(limit)
        : queryForWorkouts;
      queryForWorkouts.exec(function(err, workouts) {
        if (err) return console.error(err);
        res.json({
          _id: userId,
          username: username,
          count: workouts.length,
          log: workouts
        });
      });
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
