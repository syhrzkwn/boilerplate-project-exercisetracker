const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  serverApi: { version: '1', strict: true, deprecationErrors: true }})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error(err);
  });

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

// Models
const Schema = mongoose.Schema;

// User Model
const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
});

const User = mongoose.model('User', userSchema);

// Exercise Model
const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes ...
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  try {
    const newUser = new User({ username: username.trim() })
    const savedUser = await newUser.save()

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    })

  } catch (e) {
    return res.json({ error: e })
  }
})

// Create exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params
  const { description } = req.body;
  const { duration } = req.body;
  const { date } = req.body;

  try {
    const newExercise = new Exercise({
      userId: _id,
      description: description,
      duration: parseInt(duration),
      date: date,
    })

    const savedExercise = await newExercise.save()

    // Find the user to get the username
    const user = await User.findById(savedExercise.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: savedExercise.userId
    })

  } catch (e) {
    return res.json({ error: e })
  }
})

// Log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params
  const { from, to, limit } = req.query

  try {
    // Validate user existence
    const user = await User.findById(_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Build query object
    let query = { userId: _id }
    if (from || to) {
      query.date = {}
      if (from) {
        query.date.$gte = new Date(from)
      }
      if (to) {
        query.date.$lte = new Date(to)
      }
    }

    // Find exercises with optional limit
    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0)

    // Format the response
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log
    })
  } catch (e) {
    return res.json({ error: e })
  }
})

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
