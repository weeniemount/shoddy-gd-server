import db from '../db.js'
import express from 'express';
import helpers from '../helpers.js';
const itemRouter = express.Router();

itemRouter.post('*splat/database/uploadGJComment.php', (req, res) => {
  try {
    const { udid, userName, levelID, comment, percent, gameVersion } = req.body;
    
    if (!levelID || !comment || !userName) {
      console.log('missing required fields for comment');
      res.send('-1');
      return;
    }

    console.log(`uploading comment for level ${levelID} by ${userName} (v${gameVersion})`);

    const uploadDate = Math.floor(Date.now() / 1000);
    
    const extID = udid || 'guest';
    const userID = helpers.getUserID(extID, userName);
    const percentValue = parseInt(percent) || 0;
    
    const commentText = (gameVersion && parseInt(gameVersion) < 20) 
      ? Buffer.from(comment).toString('base64') 
      : comment;

    const stmt = db.prepare(`
      INSERT INTO comments (userName, comment, levelID, userID, timestamp, percent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userName,
      commentText,
      parseInt(levelID),
      userID,
      uploadDate,
      percentValue
    );

    if (result.changes > 0) {
      console.log(`comment created with ID: ${result.lastInsertRowid}`);
      res.send('1');
    } else {
      res.send('-1');
    }
  } catch (error) {
    console.error('error uploading comment:', error);
    res.send('-1');
  }
});

itemRouter.post('*splat/database/getGJComments.php', (req, res) => {
  try {
    const { levelID, page, count, mode, gameVersion } = req.body;
    
    if (!levelID) {
      console.log('missing levelID');
      res.send('-1');
      return;
    }

    const pageNum = parseInt(page) || 0;
    const limit = parseInt(count) || 10;
    const offset = pageNum * limit;
    const sortColumn = mode === '1' ? 'likes' : 'commentID';

    console.log(`getting comments for level ${levelID}, page ${pageNum}`);

    const countQuery = db.prepare('SELECT COUNT(*) as count FROM comments WHERE levelID = ?');
    const totalComments = countQuery.get(parseInt(levelID)).count;

    if (totalComments === 0) {
      res.send('-2');
      return;
    }

    const stmt = db.prepare(`
      SELECT c.commentID, c.userName, c.comment, c.userID, c.timestamp, c.percent, c.likes, c.isSpam,
             u.icon, u.color1, u.color2, u.iconType, u.special, u.extID
      FROM comments c
      LEFT JOIN users u ON c.userID = u.userID
      WHERE c.levelID = ?
      ORDER BY c.${sortColumn} DESC
      LIMIT ? OFFSET ?
    `);
    
    const comments = stmt.all(parseInt(levelID), limit, offset);

    if (comments.length === 0) {
      res.send('-2');
      return;
    }

    const commentStrings = comments.map(c => {
      const uploadDate = new Date(c.timestamp * 1000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }).replace(/\//g, '/') + ' ' + new Date(c.timestamp * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(':', '.');

      const commentText = (gameVersion && parseInt(gameVersion) < 20)
        ? Buffer.from(c.comment, 'base64').toString('utf-8')
        : c.comment;

      return `2~${commentText}~3~${c.userID}~4~${c.likes}~5~0~7~${c.isSpam}~9~${uploadDate}~6~${c.commentID}~10~${c.percent}`;
    });

    const userStrings = comments.map(c => {
      const extID = (c.extID && !isNaN(c.extID)) ? c.extID : 0;
      return `${c.userID}:${c.userName}:${extID}`;
    });

    const response = commentStrings.join('|') + '#' + userStrings.join('|') + `#${totalComments}:${offset}:${comments.length}`;
    
    res.send(response);
  } catch (error) {
    console.error('error getting comments:', error);
    res.send('-1');
  }
});

itemRouter.post('*splat/database/likeGJItem.php', (req, res) => {
  try {
    const { itemID, levelID, type, like } = req.body;
    
    const actualItemID = levelID || itemID;
    const actualType = levelID ? 1 : (parseInt(type) || 1);
    const isLike = parseInt(like) !== undefined ? parseInt(like) : 1;
    
    if (!actualItemID) {
      console.log('missing itemID/levelID');
      res.send('-1');
      return;
    }

    console.log(`liking item ${actualItemID} (type: ${actualType}, like: ${isLike})`);

    const ip = '127.0.0.1';
    
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM actions_likes 
      WHERE itemID = ? AND type = ? AND ip = ?
    `);
    const existing = checkStmt.get(parseInt(actualItemID), actualType, ip);

    if (existing.count > 2) {
      console.log('rate limit exceeded for likes');
      res.send('-1');
      return;
    }

    const insertStmt = db.prepare(`
      INSERT INTO actions_likes (itemID, type, isLike, ip)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(parseInt(actualItemID), actualType, isLike, ip);

    let table, column;
    switch(actualType) {
      case 1:
        table = 'levels';
        column = 'id';
        break;
      case 2:
        table = 'comments';
        column = 'commentID';
        break;
      default:
        table = 'levels';
        column = 'id';
    }

    const sign = isLike === 1 ? '+' : '-';
    const updateStmt = db.prepare(`UPDATE ${table} SET likes = likes ${sign} 1 WHERE ${column} = ?`);
    updateStmt.run(parseInt(actualItemID));

    console.log(`item ${actualItemID} like updated`);
    res.send('1');
  } catch (error) {
    console.error('error liking item:', error);
    res.send('-1');
  }
});

itemRouter.post('*splat/database/rateGJStars.php', (req, res) => {
  try {
    const { levelID, stars, rating, gjp, gjp2, secret } = req.body;
    
    const starCount = parseInt(stars || rating);
    
    if (!levelID || (!stars && !rating)) {
      console.log('missing required fields for rating (levelID and stars/rating)');
      console.log('received:', req.body);
      res.send('-1');
      return;
    }

    const levelId = parseInt(levelID);

    console.log(`rating level ${levelId} with ${starCount} stars`);

    const diffData = helpers.getDiffFromStars(starCount);

    const checkStmt = db.prepare('SELECT id FROM levels WHERE id = ?');
    const levelExists = checkStmt.get(levelId);

    if (!levelExists) {
      console.log(`level ${levelId} not found`);
      res.send('-1');
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE levels 
      SET stars = ?,
          difficulty = ?,
          auto = ?,
          demon = ?,
          demonDifficulty = 0
      WHERE id = ?
    `);

    const result = updateStmt.run(
      starCount,
      diffData.diff,
      diffData.auto,
      diffData.demon,
      levelId
    );

    if (result.changes > 0) {
      console.log(`level ${levelId} rated: ${diffData.name} (${starCount} stars)`);
      res.send('1');
    } else {
      console.log(`failed to update level ${levelId}`);
      res.send('-1');
    }
  } catch (error) {
    console.error('error rating level:', error);
    res.send('-1');
  }
});

export default itemRouter;