// controllers/itemController.js
const db = require('../config/db');

exports.getItems = async (req, res, next) => {
  try {
    const [items] = await db.query(
      'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, count: items.length, items });
  } catch (err) { next(err); }
};

exports.getItem = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM items WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item: rows[0] });
  } catch (err) { next(err); }
};

exports.createItem = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const validStatuses = ['active', 'pending', 'completed'];
    const itemStatus = validStatuses.includes(status) ? status : 'active';

    const [result] = await db.query(
      'INSERT INTO items (user_id, title, description, status) VALUES (?, ?, ?, ?)',
      [req.user.id, title, description || null, itemStatus]
    );
    const [newItem] = await db.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Item created', item: newItem[0] });
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    const [existing] = await db.query(
      'SELECT id FROM items WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });

    const validStatuses = ['active', 'pending', 'completed'];
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status !== undefined && validStatuses.includes(status)) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    values.push(req.params.id);
    await db.query(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await db.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Item updated', item: updated[0] });
  } catch (err) { next(err); }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const [existing] = await db.query(
      'SELECT id FROM items WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });
    await db.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'pending') AS pending,
        SUM(status = 'completed') AS completed
       FROM items WHERE user_id = ?`,
      [req.user.id]
    );
    const s = rows[0];
    res.json({
      success: true,
      stats: {
        total: Number(s.total),
        active: Number(s.active || 0),
        pending: Number(s.pending || 0),
        completed: Number(s.completed || 0),
      },
    });
  } catch (err) { next(err); }
};
