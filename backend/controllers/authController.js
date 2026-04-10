const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

// Helper: Generate JWT
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production_123456';
  return jwt.sign({ id }, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @route POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, hashedPassword]
    );
    const token = generateToken(result.insertId);
    res.status(201).json({ success: true, message: 'Registration successful', token, user: { id: result.insertId, name, email, phone: phone || null } });
  } catch (err) { next(err); }
};

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = generateToken(user.id);
    res.json({ success: true, message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { next(err); }
};

// @route POST /api/auth/forgot-password
// ✅ DEV MODE: returns the reset link directly in the API response (no email needed)
// For production: configure EMAIL_USER and EMAIL_PASS in .env to send real emails
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: 'Email is required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    // Always return success (don't reveal if email exists)
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, expiry, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Try to send email — but even if it fails, return the link so dev can test
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS &&
        process.env.EMAIL_USER !== 'test@gmail.com') {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset - TaskFlow',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#4f46e5;margin-bottom:8px;">Reset Your Password</h2>
              <p style="color:#6b7280;">Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
              <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
              <p style="color:#9ca3af;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
              <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Or copy this link:<br/><span style="color:#4f46e5;">${resetUrl}</span></p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
      }
    }

    // Always return the reset URL in dev mode so you can test without email setup
    console.log('\n🔑 PASSWORD RESET LINK (dev mode):');
    console.log(resetUrl);
    console.log('');

    res.json({
      success: true,
      message: emailSent ? 'Reset link sent to your email!' : 'Reset link generated successfully',
      // ✅ Return the reset URL directly — frontend will show a clickable link
      resetUrl: resetUrl,
      devMode: !emailSent,
    });

  } catch (err) { next(err); }
};

// @route POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    if (rows.length === 0)
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired. Please request a new one.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, rows[0].id]
    );
    res.json({ success: true, message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) { next(err); }
};

// @route GET /api/auth/me (Protected)
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};