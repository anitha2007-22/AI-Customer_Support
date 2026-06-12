const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    console.warn('⚠️ JWT_SECRET is missing or empty. Using fallback secret for token generation.');
  }
  return secret || 'supportdesk_default_jwt_secret_2026';
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      department: user.department,
    },
  });
};

module.exports = { generateToken, sendTokenResponse, getJwtSecret };