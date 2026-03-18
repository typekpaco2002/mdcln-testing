import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

export function setAuthCookie(res, token) {
  res.cookie('auth_token', token, COOKIE_OPTIONS);
}

export function setRefreshCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
}

export function clearAuthCookie(res) {
  const { maxAge, ...clearCookieOptions } = COOKIE_OPTIONS;
  res.clearCookie('auth_token', clearCookieOptions);
  res.clearCookie('refresh_token', clearCookieOptions);
}

export const authMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.auth_token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Refresh tokens must never authorize normal API routes.
    if (decoded?.type === "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }
    // Normalize so id, userId, and sub all work (some tokens may use only one)
    const userId = decoded.userId ?? decoded.id ?? decoded.sub;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }
    req.user = { ...decoded, userId, id: userId };
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};
