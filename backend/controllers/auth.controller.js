const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwtToken');

// Production cookie options for Vercel + Render deployment
const getCookieOptions = (httpOnly = true) => ({
  httpOnly,
  secure: true, // Always true for production (both Vercel and Render use HTTPS)
  sameSite: 'none', // CRITICAL: Must be 'none' for cross-origin cookies
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/' // Ensure cookie works across all paths
});

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    const token = generateToken(user);

    // Set httpOnly cookie for security (for API authentication)
    res.cookie('token', token, getCookieOptions(true));

    // Set non-httpOnly cookie for Socket.IO access
    res.cookie('socketToken', token, getCookieOptions(false));

    // Set session data for Socket.IO authentication
    if (req.session) {
      req.session.userId = user.id;
      req.session.userName = user.name;
    }

    console.log('User registered and cookies set:', user.email);
    console.log('Cookie options:', getCookieOptions(true));

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ message: 'Registration error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);

    // Set httpOnly cookie for security (for API authentication)
    res.cookie('token', token, getCookieOptions(true));

    // Set non-httpOnly cookie for Socket.IO access
    res.cookie('socketToken', token, getCookieOptions(false));

    // Set session data for Socket.IO authentication
    if (req.session) {
      req.session.userId = user.id;
      req.session.userName = user.name;
    }

    console.log('User logged in and cookies set:', user.email);
    console.log('Cookie options:', getCookieOptions(true));

    res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Login error', error: err.message });
  }
};

exports.logout = (req, res) => {
  // Clear session data
  if (req.session) {
    req.session.destroy();
  }
  
  // Clear both cookies with same options used to set them
  res.clearCookie('token', getCookieOptions(true));
  res.clearCookie('socketToken', getCookieOptions(false));
  
  console.log('User logged out and cookies cleared');
  
  res.status(200).json({ message: 'Logged out successfully' });
};