// Customer profile photos. Stored outside the web root under server-generated names, checked by
// reading the file header (not the browser's file type), stripped of metadata, and served only to
// the customer, admins, and staff for customers who have a booking.
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { imageSize } = require('image-size');
const { User, Booking } = require('../db');
const { requireUser } = require('../auth');
const { HttpError, wrap, token } = require('../util');
const { stripMetadata } = require('../imageclean');
const cfg = require('../config');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const AVATAR_DIR = path.join(DATA_DIR, cfg.uploadDir, 'avatars');
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const MIN_SIDE = 128, MAX_SIDE = 6000;
const EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } });
const avatarUrl = u => (u.avatar ? `/api/avatars/${u._id}?v=${u.avatarVersion || 0}` : null);
const removeFile = name => { if (name) fs.rm(path.join(AVATAR_DIR, path.basename(name)), { force: true }, () => {}); };

router.post('/me/avatar', requireUser(), (req, res, next) => upload.single('photo')(req, res, err => {
  if (err) return next(new HttpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 2 MB or smaller' : 'Upload failed. Try again.'));
  next();
}), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a photo to upload');
  let dim;
  try { dim = imageSize(req.file.buffer); } catch { throw new HttpError(400, 'Only JPG, PNG or WebP photos are allowed'); }
  if (!EXT[dim.type]) throw new HttpError(400, 'Use a JPG, PNG or WebP photo');
  if (Math.min(dim.width, dim.height) < MIN_SIDE) throw new HttpError(400, `The photo is too small. Use at least ${MIN_SIDE} pixels on each side.`);
  if (Math.max(dim.width, dim.height) > MAX_SIDE) throw new HttpError(400, `The photo is too large. Keep each side under ${MAX_SIDE} pixels.`);
  const clean = stripMetadata(req.file.buffer, dim.type);
  if (!clean) throw new HttpError(400, 'Could not read this photo. Try another file.');
  const check = imageSize(clean);
  if (check.width !== dim.width || check.height !== dim.height) throw new HttpError(400, 'Could not read this photo. Try another file.');

  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  const filename = `${req.user._id}-${token(10)}.${dim.type}`;
  fs.writeFileSync(path.join(AVATAR_DIR, filename), clean, { mode: 0o600 });
  const prev = await User.findById(req.user._id, { avatar: 1 }).lean();
  const u = await User.findByIdAndUpdate(req.user._id, { $set: { avatar: filename, avatarMime: EXT[dim.type] }, $inc: { avatarVersion: 1 } }, { new: true }).lean();
  if (prev?.avatar) removeFile(prev.avatar);
  res.status(201).json({ avatarUrl: avatarUrl(u) });
}));

router.delete('/me/avatar', requireUser(), wrap(async (req, res) => {
  const prev = await User.findById(req.user._id, { avatar: 1 }).lean();
  await User.updateOne({ _id: req.user._id }, { $set: { avatar: '', avatarMime: '' }, $inc: { avatarVersion: 1 } });
  if (prev?.avatar) removeFile(prev.avatar);
  res.json({ avatarUrl: null });
}));

router.get('/avatars/:userId', requireUser(), wrap(async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.userId)) throw new HttpError(404, 'Not found');
  const target = await User.findById(req.params.userId, { role: 1, avatar: 1, avatarMime: 1 }).lean();
  if (!target || !target.avatar) throw new HttpError(404, 'Not found');
  const self = String(target._id) === String(req.user._id);
  const staffForCustomer = req.user.role !== 'customer' && target.role === 'customer' && await Booking.exists({ userId: target._id });
  if (!self && !staffForCustomer) throw new HttpError(404, 'Not found');
  res.set('Cache-Control', 'private, max-age=3600').set('X-Content-Type-Options', 'nosniff')
    .type(target.avatarMime || 'application/octet-stream')
    .sendFile(path.join(AVATAR_DIR, path.basename(target.avatar)));
}));

module.exports = { router, avatarUrl };
