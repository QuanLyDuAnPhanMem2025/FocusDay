const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

// @route   GET /api/tasks
// @desc    Get all tasks
router.get('/', getAllTasks);

// @route   POST /api/tasks
// @desc    Create a task
router.post('/', createTask);

// @route   PUT /api/tasks/:id
// @desc    Update a task
router.put('/:id', updateTask);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete('/:id', deleteTask);

module.exports = router;
