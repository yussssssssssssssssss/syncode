const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwtToken');

// Simple in-memory failed login tracker (suitable for small-scale; persist to DB for production)
const failedLogins = new Map(); // key: email, value: { count, lastAttempt, lockedUntil }

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (pw) => pw && pw.length >= 8; // basic check; consider zxcvbn for production

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    if (!isStrongPassword(password)) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

  // increase bcrypt rounds for stronger hashing (12 rounds)
  const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    const token = generateToken(user);

    // Cookie options: SameSite=None requires Secure per modern browsers.
    // Use 'none' + secure in production; use 'lax' in development to ensure cookies are stored locally.
    const cookieOptionsSecure = { maxAge: 7 * 24 * 60 * 60 * 1000 };
    const sameSiteVal = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const secureFlag = process.env.NODE_ENV === 'production';

    // Set httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: sameSiteVal,
      ...cookieOptionsSecure
    });

    // Set non-httpOnly cookie for Socket.IO access
    res.cookie('socketToken', token, {
      httpOnly: false,
      secure: secureFlag,
      sameSite: sameSiteVal,
      ...cookieOptionsSecure
    });

    // Set session data for Socket.IO authentication
    if (req.session) {
      req.session.userId = user.id;
      req.session.userName = user.name;
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
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

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });

    // Check lockout
    const record = failedLogins.get(email) || { count: 0 };
    if (record.lockedUntil && record.lockedUntil > Date.now()) {
      const secs = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${secs}s` });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // increment failed count
      const prev = failedLogins.get(email) || { count: 0 };
      prev.count = (prev.count || 0) + 1;
      prev.lastAttempt = Date.now();
      if (prev.count >= 5) prev.lockedUntil = Date.now() + (15 * 60 * 1000); // lock 15 minutes
      failedLogins.set(email, prev);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const prev = failedLogins.get(email) || { count: 0 };
      prev.count = (prev.count || 0) + 1;
      prev.lastAttempt = Date.now();
      if (prev.count >= 5) prev.lockedUntil = Date.now() + (15 * 60 * 1000);
      failedLogins.set(email, prev);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // reset failed login on success
    if (failedLogins.has(email)) failedLogins.delete(email);

    const token = generateToken(user);

    // Cookie options: SameSite=None requires Secure per modern browsers.
    const sameSiteVal2 = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const secureFlag2 = process.env.NODE_ENV === 'production';
    const cookieOptionsSecure2 = { maxAge: 7 * 24 * 60 * 60 * 1000 };

    // Set httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: secureFlag2,
      sameSite: sameSiteVal2,
      ...cookieOptionsSecure2
    });

    // Set non-httpOnly cookie for Socket.IO access
    res.cookie('socketToken', token, {
      httpOnly: false,
      secure: secureFlag2,
      sameSite: sameSiteVal2,
      ...cookieOptionsSecure2
    });

    // Set session data for Socket.IO authentication
    if (req.session) {
      req.session.userId = user.id;
      req.session.userName = user.name;
    }

    res.status(200).json({
      message: 'Login successful',
      token,
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
  
  // Clear both cookies
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production'
  });
  
  res.clearCookie('socketToken', {
    httpOnly: false,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production'
  });
  
  res.status(200).json({ message: 'Logged out successfully' });
};
