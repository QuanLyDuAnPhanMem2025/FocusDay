const User = require('../models/User');

// @desc    Get or create user by email
// @route   POST /api/users/get-or-create
// @access  Public (for now)
exports.getOrCreateUser = async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    // Tìm user theo email
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Tạo user mới nếu chưa có
      user = new User({
        email: email.toLowerCase(),
        name: name || 'User',
        picture: picture || null,
        googleId: googleId || null,
      });
      await user.save();
    } else {
      // Cập nhật thông tin nếu có thay đổi
      if (name && user.name !== name) user.name = name;
      if (picture && user.picture !== picture) user.picture = picture;
      if (googleId && user.googleId !== googleId) user.googleId = googleId;
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user by email
// @route   GET /api/users/:email
// @access  Public (for now)
exports.getUserByEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

