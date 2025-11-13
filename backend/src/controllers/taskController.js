const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get all tasks for a user
// @route   GET /api/tasks
// @access  Public (for now, will be private later)
exports.getAllTasks = async (req, res) => {
  try {
    const userEmail = req.query.userId || req.query.userEmail;
    
    if (!userEmail) {
      return res.status(400).json({ msg: 'User email is required' });
    }

    // Tìm tasks theo userEmail (tương thích với cả userId cũ)
    const tasks = await Task.find({ userEmail: userEmail.toLowerCase() });
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Public (for now)
exports.createTask = async (req, res) => {
  const { title, dueDate, date, time, type, notes, userId, userEmail, userName, userPicture } = req.body;

  try {
    // Lấy email từ userId hoặc userEmail
    const email = (userEmail || userId || '').toLowerCase();
    
    if (!email) {
      return res.status(400).json({ msg: 'User email is required' });
    }
    if (!title?.trim()) {
      return res.status(400).json({ msg: 'Task title is required' });
    }

    const rawDateValue = dueDate || date;
    if (!rawDateValue) {
      return res.status(400).json({ msg: 'Task date is required' });
    }

    const parsedDueDate = new Date(rawDateValue);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ msg: 'Invalid task date' });
    }

    // Tự động tạo hoặc lấy user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name: userName || 'User',
        picture: userPicture || null,
      });
      await user.save();
    }

    // Tạo task với userEmail và userId reference
    const newTask = new Task({
      title: title.trim(),
      dueDate: parsedDueDate,
      time,
      type: type || 'default',
      notes, // Add notes field
      userEmail: email,
      userId: user._id, // Reference to User model
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Public (for now)
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Later, we'll add a check to make sure the user owns the task
    // Không cho phép thay đổi userEmail và userId
    const { userEmail, userId, ...updateData } = req.body;
    
    task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Public (for now)
exports.deleteTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Later, we'll add a check to make sure the user owns the task

    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
