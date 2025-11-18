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

    // Parse date string (YYYY-MM-DD) thành year, month, day để tránh timezone issues
    let parsedDueDate;
    if (typeof rawDateValue === 'string' && rawDateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Nếu là string YYYY-MM-DD, parse trực tiếp
      const [year, month, day] = rawDateValue.split('-').map(Number);
      parsedDueDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      // Nếu là Date object hoặc ISO string, parse bình thường
      parsedDueDate = new Date(rawDateValue);
    }
    
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
    const { userEmail, userId, dueDate, date, ...updateData } = req.body;
    
    // Xử lý date nếu có
    if (dueDate || date) {
      const rawDateValue = dueDate || date;
      let parsedDueDate;
      if (typeof rawDateValue === 'string' && rawDateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Nếu là string YYYY-MM-DD, parse trực tiếp
        const [year, month, day] = rawDateValue.split('-').map(Number);
        parsedDueDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        // Nếu là Date object hoặc ISO string, parse bình thường
        parsedDueDate = new Date(rawDateValue);
      }
      
      if (!Number.isNaN(parsedDueDate.getTime())) {
        updateData.dueDate = parsedDueDate;
      }
    }
    
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
    const taskId = req.params.id;
    console.log('[Backend] Delete task request received for ID:', taskId);

    if (!taskId) {
      console.error('[Backend] No task ID provided');
      return res.status(400).json({ msg: 'Task ID is required' });
    }

    // Validate MongoDB ObjectId format
    if (!taskId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('[Backend] Invalid task ID format:', taskId);
      return res.status(400).json({ msg: 'Invalid task ID format' });
    }

    let task = await Task.findById(taskId);
    console.log('[Backend] Task found:', task ? 'Yes' : 'No');

    if (!task) {
      console.error('[Backend] Task not found with ID:', taskId);
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Later, we'll add a check to make sure the user owns the task

    const deleteResult = await Task.findByIdAndDelete(taskId);
    console.log('[Backend] Task deleted successfully:', deleteResult ? 'Yes' : 'No');

    if (!deleteResult) {
      console.error('[Backend] Failed to delete task, deleteResult is null');
      return res.status(500).json({ msg: 'Failed to delete task' });
    }

    console.log('[Backend] Sending success response');
    res.status(200).json({ msg: 'Task removed', deletedId: taskId });
  } catch (err) {
    console.error('[Backend] Delete task error:', err.message);
    console.error('[Backend] Error stack:', err.stack);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};
