const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookie:', token.substring(0, 20) + '...');
    }
    
    // If no cookie token, try Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in header:', token.substring(0, 20) + '...');
    }

    // If still no token, return unauthorized
    if (!token) {
      console.log('No token found in cookies or headers');
      console.log('Available cookies:', req.cookies);
      console.log('Authorization header:', req.headers.authorization);
      return res.status(401).json({ 
        message: 'Not authenticated - no token provided',
        debug: {
          cookiesPresent: !!req.cookies,
          authHeaderPresent: !!req.headers.authorization,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : []
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully for user ID:', decoded.id);

    // Get user from database
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id } 
    });

    if (!user) {
      console.log('User not found for decoded ID:', decoded.id);
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    // Attach user to request
    req.user = user;
    console.log('User authenticated:', user.email);

    // Set session data for Socket.IO authentication if session exists
    if (req.session) {
      req.session.userId = user.id;
      req.session.userName = user.name || user.email;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    } else {
      return res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
  }
};

module.exports = protect;