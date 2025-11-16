import db from '../db.js'
import express from 'express';
import helpers from '../helpers.js';
const levelRouter = express.Router();

levelRouter.post('*splat/database/uploadGJLevel.php', (req, res) => {
  try {
    const {
      udid,
      userName,
      levelName,
      levelDesc,
      levelString,
      levelVersion,
      levelLength,
      audioTrack,
      gameVersion,
      password,
      original,
      twoPlayer,
      songID,
      objects,
      coins,
      requestedStars,
      auto,
      ldm,
      unlisted,
      accountID
    } = req.body;

    if (!levelString || !levelName || !userName) {
      res.send('-1');
      return;
    }

    console.log(`received level: ${levelName} from ${userName}`);

    const uploadDate = Math.floor(Date.now() / 1000);
    
    const extID = accountID || udid || 'guest';
    const userID = helpers.getUserID(extID, userName);
    
    const rateLimitCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM levels 
      WHERE userID = ? AND createdAt > ?
    `).get(userID, uploadDate - 60);

    if (rateLimitCheck.count > 0) {
      console.log(`rate limit hit for user: ${userName}`);
      res.send('-1');
      return;
    }

    const existingLevel = db.prepare(`
      SELECT id FROM levels 
      WHERE levelName = ? AND userID = ?
    `).get(levelName, userID);

    if (existingLevel) {
      const stmt = db.prepare(`
        UPDATE levels 
        SET levelDesc = ?,
            levelString = ?,
            levelVersion = ?,
            levelLength = ?,
            audioTrack = ?,
            gameVersion = ?,
            password = ?,
            original = ?,
            twoPlayer = ?,
            songID = ?,
            objects = ?,
            coins = ?,
            requestedStars = ?,
            auto = ?,
            isLDM = ?,
            unlisted = ?,
            updatedAt = ?
        WHERE id = ? AND userID = ?
      `);
      
      const result = stmt.run(
        levelDesc || '',
        levelString,
        parseInt(levelVersion) || 1,
        parseInt(levelLength) || 0,
        parseInt(audioTrack) || 0,
        parseInt(gameVersion) || 1,
        password || '0',
        parseInt(original) || 0,
        parseInt(twoPlayer) || 0,
        parseInt(songID) || 0,
        parseInt(objects) || 0,
        parseInt(coins) || 0,
        parseInt(requestedStars) || 0,
        parseInt(auto) || 0,
        parseInt(ldm) || 0,
        parseInt(unlisted) || 0,
        uploadDate,
        existingLevel.id,
        userID
      );

      if (result.changes > 0) {
        res.send(existingLevel.id.toString());
        console.log(`updated level ID: ${existingLevel.id}`);
      } else {
        res.send('-1');
      }
    } else {
      const stmt = db.prepare(`
        INSERT INTO levels (
          udid, userName, userID, levelName, levelDesc, levelString,
          levelVersion, levelLength, audioTrack, gameVersion,
          password, original, twoPlayer, songID, objects,
          coins, requestedStars, auto, isLDM, unlisted,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        udid || extID,
        userName,
        userID,
        levelName,
        levelDesc || '',
        levelString,
        parseInt(levelVersion) || 1,
        parseInt(levelLength) || 0,
        parseInt(audioTrack) || 0,
        parseInt(gameVersion) || 1,
        password || '0',
        parseInt(original) || 0,
        parseInt(twoPlayer) || 0,
        parseInt(songID) || 0,
        parseInt(objects) || 0,
        parseInt(coins) || 0,
        parseInt(requestedStars) || 0,
        parseInt(auto) || 0,
        parseInt(ldm) || 0,
        parseInt(unlisted) || 0,
        uploadDate,
        uploadDate
      );

      const newLevelId = result.lastInsertRowid;
      res.send(newLevelId.toString());
      console.log(`created new level ID: ${newLevelId}`);
    }
  } catch (error) {
    console.error('error uploading level:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/getGJLevels.php', (req, res) => {
  try {
    const { type, str, page, diff, len } = req.body;
    const pageNum = parseInt(page) || 0;
    const limit = 10;
    const offset = pageNum * limit;

    let query = `SELECT levels.*, users.extID 
                 FROM levels 
                 LEFT JOIN users ON levels.userID = users.userID`;
    let params = [];
    let whereClauses = [];

    switch(type) {
      case '0':
      case '15':
        if (str && str.trim()) {
          whereClauses.push('levelName LIKE ?');
          params.push(`%${str}%`);
        }
        break;
      case '1':
        break;
      case '2':
        break;
      case '5':
        if (str) {
          whereClauses.push('levels.userName = ?');
          params.push(str);
        }
        break;
      default:
        break;
    }

    if (diff && diff !== '-') {
      const diffValue = parseInt(diff);
      if (diffValue === -1) {
        whereClauses.push('demon = 1');
      } else if (diffValue === -2) {
        whereClauses.push('auto = 1');
      } else if (diffValue >= 0) {
        whereClauses.push('difficulty = ?');
        params.push(diffValue);
      }
    }

    if (len && len !== '-') {
      whereClauses.push('levelLength = ?');
      params.push(parseInt(len));
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY levels.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const levels = stmt.all(...params);

    if (levels.length === 0) {
      res.send('-1');
      return;
    }

    const levelData = levels.map((level) => {
      return `1:${level.id}:2:${level.levelName}:3:${level.levelDesc || ''}:5:${level.levelVersion}:6:${level.userID}:8:${level.difficulty}:9:${level.levelLength}:10:${level.downloads}:12:${level.audioTrack}:13:${level.gameVersion}:14:${level.likes}:17:${level.demon}:43:${level.demonDifficulty}:25:${level.auto}:18:${level.stars}:19:0:42:0:45:0:15:${level.levelLength}:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:0:4:${level.levelString}`;
    }).join('|');

    const userString = levels.map(level => {
      const extID = (level.extID && !isNaN(level.extID)) ? level.extID : 0;
      return `${level.userID}:${level.userName}:${extID}`;
    }).join('|');

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
    
    res.send(`${levelData}#${userString}##${totalCount}:${offset}:${limit}#`);
  } catch (error) {
    console.error('error getting levels:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/downloadGJLevel.php', (req, res) => {
  try {
    const { levelID, inc } = req.body;
    console.log(`downloading level ID: ${levelID}`);

    const stmt = db.prepare('SELECT * FROM levels WHERE id = ?');
    const level = stmt.get(parseInt(levelID));

    if (!level) {
      res.send('-1');
      return;
    }

    if (inc === '1') {
      db.prepare('UPDATE levels SET downloads = downloads + 1 WHERE id = ?').run(parseInt(levelID));
    }

    const response = `1:${level.id}:2:${level.levelName}:3:${level.levelDesc}:5:${level.levelVersion}:6:${level.userName}:8:${level.difficulty}:9:${level.levelLength}:10:${level.downloads}:12:${level.audioTrack}:13:${level.gameVersion}:14:${level.likes}:17:${level.demon}:43:${level.demonDifficulty}:25:${level.auto}:18:${level.stars}:19:0:42:0:45:0:15:0:30:0:31:0:28::29::35:0:36::37:0:38:1:39:0:46:1:47:2:40::27:AwQ#${level.levelString}#`;
    
    res.send(response);
  } catch (error) {
    console.error('error downloading level:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/updateGJLevel.php', (req, res) => {
  try {
    const { levelID, levelVersion, gameVersion } = req.body;
    console.log(`update check for level ID: ${levelID}`);

    const stmt = db.prepare('SELECT levelVersion, gameVersion FROM levels WHERE id = ?');
    const level = stmt.get(parseInt(levelID));

    if (!level) {
      res.send('-1');
      return;
    }

    const clientVersion = parseInt(levelVersion) || 1;
    const serverVersion = level.levelVersion;

    if (clientVersion >= serverVersion) {
      res.send('1');
    } else {
      res.send('2');
    }
  } catch (error) {
    console.error('error checking level update:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/rateGJLevel.php', (req, res) => {
  try {
    const { levelID, stars, rating } = req.body;
    
    const starsValue = stars || rating;
    
    if (!levelID || !starsValue) {
      console.log('missing levelID or stars/rating');
      res.send('-1');
      return;
    }

    const starsNum = parseInt(starsValue);
    const diffInfo = helpers.getDiffFromStars(starsNum);
    
    console.log(`rating level ID: ${levelID} with ${starsNum} stars -> ${diffInfo.name}`);

    const levelCheck = db.prepare('SELECT id, levelName FROM levels WHERE id = ?').get(parseInt(levelID));
    if (!levelCheck) {
      console.log(`level ${levelID} not found`);
      res.send('-1');
      return;
    }
    console.log(`found level: ${levelCheck.levelName}`);

    const stmt = db.prepare(`
      UPDATE levels 
      SET difficulty = ?, 
          auto = ?, 
          demon = ?, 
          stars = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      diffInfo.diff,
      diffInfo.auto,
      diffInfo.demon,
      starsNum,
      parseInt(levelID)
    );

    console.log(`update result - changes: ${result.changes}`);

    if (result.changes > 0) {
      const updated = db.prepare('SELECT difficulty, auto, demon, stars FROM levels WHERE id = ?').get(parseInt(levelID));
      console.log(`level ${levelID} rated successfully:`, {
        difficulty: updated.difficulty,
        auto: updated.auto,
        demon: updated.demon,
        stars: updated.stars,
        name: diffInfo.name
      });
      res.send('1');
    } else {
      console.log('no rows updated');
      res.send('-1');
    }
  } catch (error) {
    console.error('error rating level:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/likeGJLevel.php', (req, res) => {
  try {
    const { levelID } = req.body;
    console.log(`liking level ID: ${levelID}`);

    const stmt = db.prepare('UPDATE levels SET likes = likes + 1 WHERE id = ?');
    const result = stmt.run(parseInt(levelID));

    if (result.changes > 0) {
      res.send('1');
    } else {
      res.send('-1');
    }
  } catch (error) {
    console.error('error liking level:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/rateGJDemon.php', (req, res) => {
  try {
    const { levelID, rating } = req.body;
    
    if (!levelID || !rating) {
      console.log('missing levelID or rating');
      res.send('-1');
      return;
    }

    let demonDiff;
    let demonName;
    switch(rating) {
      case '1':
        demonDiff = 3;
        demonName = 'Easy';
        break;
      case '2':
        demonDiff = 4;
        demonName = 'Medium';
        break;
      case '3':
        demonDiff = 0;
        demonName = 'Hard';
        break;
      case '4':
        demonDiff = 5;
        demonName = 'Insane';
        break;
      case '5':
        demonDiff = 6;
        demonName = 'Extreme';
        break;
      default:
        console.log('invalid rating value:', rating);
        res.send('-1');
        return;
    }

    console.log(`rating demon level ID: ${levelID} as ${demonName} (${demonDiff})`);

    const level = db.prepare('SELECT id, levelName, demon FROM levels WHERE id = ?').get(parseInt(levelID));
    
    if (!level) {
      console.log(`level ${levelID} not found`);
      res.send('-1');
      return;
    }

    console.log(`found level: ${level.levelName}, demon=${level.demon}`);

    const stmt = db.prepare(`
      UPDATE levels 
      SET demonDifficulty = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(demonDiff, parseInt(levelID));

    console.log(`update result - changes: ${result.changes}`);

    if (result.changes > 0) {
      const updated = db.prepare('SELECT demonDifficulty FROM levels WHERE id = ?').get(parseInt(levelID));
      console.log(`level ${levelID} demon difficulty set to ${demonName} (${updated.demonDifficulty})`);
      res.send(levelID);
    } else {
      console.log('no rows updated');
      res.send('-1');
    }
  } catch (error) {
    console.error('error rating demon:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/reportGJLevel.php', (req, res) => {
  try {
    const { levelID } = req.body;
    
    if (!levelID) {
      res.send('-1');
      return;
    }

    console.log(`level ${levelID} reported`);
    
    res.send('1');
  } catch (error) {
    console.error('error reporting level:', error);
    res.send('-1');
  }
});

levelRouter.post('*splat/database/deleteGJLevelUser.php', (req, res) => {
  try {
    const { levelID, gjp, accountID } = req.body;
    
    if (!levelID) {
      res.send('-1');
      return;
    }

    console.log(`attempting to delete level ${levelID}`);

    const stmt = db.prepare('DELETE FROM levels WHERE id = ? LIMIT 1');
    const result = stmt.run(parseInt(levelID));

    if (result.changes > 0) {
      console.log(`level ${levelID} deleted successfully`);
      res.send('1');
    } else {
      res.send('-1');
    }
  } catch (error) {
    console.error('error deleting level:', error);
    res.send('-1');
  }
});

export default levelRouter;