const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/login', (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Use POST /api/login with email and password to authenticate.',
  });
});

router.get('/register', (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Use POST /api/register with name, email, and password to create an account.',
  });
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;