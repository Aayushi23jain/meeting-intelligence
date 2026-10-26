import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
function issue(user, res) {
  const token = jwt.sign(
    { id: String(user._id), email: user.email, workspaceId: user.workspaceId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  res.cookie('token', token, cookieOptions);
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      workspaceId: user.workspaceId,
    },
  };
}
export async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!email || !password || String(password).length < 8)
    return res
      .status(400)
      .json({ error: 'Email and password (at least 8 characters) are required.' });
  if (await User.findOne({ email: String(email).toLowerCase() }))
    return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = await User.create({
    name: String(name || 'User').slice(0, 80),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    workspaceId: crypto.randomUUID(),
  });
  res.status(201).json(issue(user, res));
}
export async function login(req, res) {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    return res.status(401).json({ error: 'Invalid email or password.' });
  res.json(issue(user, res));
}
export function me(req, res) {
  res.json({ user: { id: req.user.id, email: req.user.email, workspaceId: req.user.workspaceId } });
}
export function logout(_req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ ok: true });
}
