const Task = require('../models/Task');
const User = require('../models/User');

const coerceBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

const coerceNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const parseTimeToMinutes = (value) => {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
};

const parseOptionalDateTime = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const isAfterDueDateEndOfDay = (candidate, dueDateUtcMidnight) => {
  if (!(candidate instanceof Date) || Number.isNaN(candidate.getTime())) return false;
  if (!(dueDateUtcMidnight instanceof Date) || Number.isNaN(dueDateUtcMidnight.getTime())) return false;
  const endOfDay = new Date(dueDateUtcMidnight);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return candidate.getTime() > endOfDay.getTime();
};

// @desc    Get all tasks for a user
// @route   GET /api/tasks
// @access  Public (for now, will be private later)
exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ msg: 'User id is required' });
    }
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid user id format' });
    }

    const tasks = await Task.find({ userId });
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
  const {
    title,
    dueDate,
    date,
    time,
    type,
    notes,
    userId,
    durationMinutes,
    priority,
    effort,
  } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ msg: 'User id is required' });
    }
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid user id format' });
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


    const normalizedDurationMinutes = coerceNumber(durationMinutes);

    const normalizedTime = typeof time === 'string' ? time.trim() : time;

    if (normalizedTime) {
      const startMinutes = parseTimeToMinutes(normalizedTime);
      if (startMinutes === undefined) {
        return res.status(400).json({ msg: 'Invalid time format (expected HH:mm)' });
      }
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const newTask = new Task({
      title: title.trim(),
      dueDate: parsedDueDate,
      time: normalizedTime ? normalizedTime : null,
      durationMinutes: normalizedDurationMinutes,
      priority: coerceNumber(priority),
      effort,
      type: type || 'default',
      notes, // Add notes field
      userId,
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
    const { userId, ...updateData } = req.body;
    const { dueDate, date } = req.body; // Keep dueDate and date separate

    if (Object.prototype.hasOwnProperty.call(updateData, 'durationMinutes')) {
      updateData.durationMinutes = coerceNumber(updateData.durationMinutes);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'priority')) {
      updateData.priority = coerceNumber(updateData.priority);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'time')) {
      if (updateData.time === null || updateData.time === undefined || (typeof updateData.time === 'string' && updateData.time.trim() === '')) {
        updateData.time = null;
      } else if (typeof updateData.time === 'string') {
        updateData.time = updateData.time.trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'time') && updateData.time) {
      const startMinutes = parseTimeToMinutes(updateData.time);
      if (startMinutes === undefined) {
        return res.status(400).json({ msg: 'Invalid time format (expected HH:mm)' });
      }
    }
    
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
    } else if (task.dueDate) {
      // Keep existing dueDate if no new date provided
      updateData.dueDate = task.dueDate;
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
