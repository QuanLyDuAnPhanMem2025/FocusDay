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
  // Reference to User model, but also support string email for backward compatibility
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional để tương thích với dữ liệu cũ
  },
  userEmail: {
    type: String,
    required: true, // Dùng email làm identifier chính
    lowercase: true,
    trim: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
