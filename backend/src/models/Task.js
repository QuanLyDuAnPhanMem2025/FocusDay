const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  dueDate: {
    type: Date, // Changed from String to Date for better date management
    required: true,
  },
  time: {
    type: String, // Storing as HH:mm
  },
  type: {
    type: String,
    enum: ['meeting', 'work', 'personal', 'default'],
    default: 'default',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
