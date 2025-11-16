import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const db = new Database('GeometryJump.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userID INTEGER PRIMARY KEY AUTOINCREMENT,
    isRegistered INTEGER DEFAULT 0,
    extID TEXT NOT NULL UNIQUE,
    userName TEXT NOT NULL,
    lastPlayed INTEGER DEFAULT (strftime('%s', 'now')),
    icon INTEGER DEFAULT 0,
    color1 INTEGER DEFAULT 0,
    color2 INTEGER DEFAULT 3,
    iconType INTEGER DEFAULT 0,
    special INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    userCoins INTEGER DEFAULT 0,
    demons INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    creatorPoints INTEGER DEFAULT 0,
    diamonds INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT NOT NULL,
    userName TEXT NOT NULL,
    levelName TEXT NOT NULL,
    levelDesc TEXT,
    levelString TEXT NOT NULL,
    levelVersion INTEGER DEFAULT 1,
    levelLength INTEGER DEFAULT 0,
    audioTrack INTEGER DEFAULT 0,
    gameVersion INTEGER DEFAULT 1,
    password TEXT DEFAULT '0',
    original INTEGER DEFAULT 0,
    twoPlayer INTEGER DEFAULT 0,
    songID INTEGER DEFAULT 0,
    objects INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    requestedStars INTEGER DEFAULT 0,
    auto INTEGER DEFAULT 0,
    isLDM INTEGER DEFAULT 0,
    unlisted INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    difficulty INTEGER DEFAULT 0,
    demon INTEGER DEFAULT 0,
    demonDifficulty INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE TABLE IF NOT EXISTS comments (
    commentID INTEGER PRIMARY KEY AUTOINCREMENT,
    userName TEXT NOT NULL,
    comment TEXT NOT NULL,
    levelID INTEGER NOT NULL,
    userID INTEGER NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    percent INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    isSpam INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS actions_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemID INTEGER NOT NULL,
    type INTEGER NOT NULL,
    isLike INTEGER NOT NULL,
    ip TEXT NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_users_extID ON users(extID);
  CREATE INDEX IF NOT EXISTS idx_userName ON levels(userName);
  CREATE INDEX IF NOT EXISTS idx_udid ON levels(udid);
  CREATE INDEX IF NOT EXISTS idx_levelName_userName ON levels(levelName, userName);
  CREATE INDEX IF NOT EXISTS idx_createdAt ON levels(createdAt);
  CREATE INDEX IF NOT EXISTS idx_difficulty ON levels(difficulty);
  CREATE INDEX IF NOT EXISTS idx_comments_levelID ON comments(levelID);
  CREATE INDEX IF NOT EXISTS idx_comments_userID ON comments(userID);
  CREATE INDEX IF NOT EXISTS idx_actions_likes_item ON actions_likes(itemID, type, ip);
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const helpers = {
  getAudioTrack(id) {
    const songs = [
      "Stereo Madness by ForeverBound",
      "Back on Track by DJVI",
      "Polargeist by Step",
      "Dry Out by DJVI",
      "Base after Base by DJVI",
      "Can't Let Go by DJVI",
      "Jumper by Waterflame",
      "Time Machine by Waterflame",
      "Cycles by DJVI",
      "xStep by DJVI",
      "Clutterfunk by Waterflame",
      "Theory of Everything by DJ Nate",
      "Electroman Adventures by Waterflame",
      "Club Step by DJ Nate",
      "Electrodynamix by DJ Nate",
      "Hexagon Force by Waterflame",
      "Blast Processing by Waterflame",
      "Theory of Everything 2 by DJ Nate",
      "Geometrical Dominator by Waterflame",
      "Deadlocked by F-777",
      "Fingerbang by MDK",
      "The Seven Seas by F-777",
      "Viking Arena by F-777",
      "Airborne Robots by F-777",
      "Secret by RobTopGames"
    ];
    return songs[id] || "Unknown by DJVI";
  },

  getDifficulty(diff, auto, demon) {
    if (auto != 0) return "Auto";
    if (demon != 0) return "Demon";
    
    switch(diff) {
      case 0: return "N/A";
      case 10: return "Easy";
      case 20: return "Normal";
      case 30: return "Hard";
      case 40: return "Harder";
      case 50: return "Insane";
      default: return "Unknown";
    }
  },

  getLength(length) {
    switch(length) {
      case 0: return "Tiny";
      case 1: return "Short";
      case 2: return "Medium";
      case 3: return "Long";
      case 4: return "XL";
      case 5: return "Platformer";
      default: return "Unknown";
    }
  },

  getGameVersion(version) {
    if (version > 17) return version / 10;
    if (version == 11) return "1.8";
    if (version == 10) return "1.7";
    return `1.${version - 1}`;
  },

  getDemonDiff(dmn) {
    switch(dmn) {
      case 3: return "Easy";
      case 4: return "Medium";
      case 5: return "Insane";
      case 6: return "Extreme";
      default: return "Hard";
    }
  },

  getDiffFromStars(stars) {
    let diff, auto = 0, demon = 0, diffname;
    
    switch(stars) {
      case 1:
        diffname = "Auto";
        diff = 50;
        auto = 1;
        break;
      case 2:
        diffname = "Easy";
        diff = 10;
        break;
      case 3:
        diffname = "Normal";
        diff = 20;
        break;
      case 4:
      case 5:
        diffname = "Hard";
        diff = 30;
        break;
      case 6:
      case 7:
        diffname = "Harder";
        diff = 40;
        break;
      case 8:
      case 9:
        diffname = "Insane";
        diff = 50;
        break;
      case 10:
        diffname = "Demon";
        diff = 50;
        demon = 1;
        break;
      default:
        diffname = `N/A: ${stars}`;
        diff = 0;
        break;
    }
    
    return { diff, auto, demon, name: diffname };
  },

  getUserID(extID, userName) {
    const isRegistered = !isNaN(extID) ? 1 : 0;
    
    let user = db.prepare('SELECT userID FROM users WHERE extID = ?').get(extID);
    
    if (!user) {
      const stmt = db.prepare(`
        INSERT INTO users (isRegistered, extID, userName, lastPlayed)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(isRegistered, extID, userName, Math.floor(Date.now() / 1000));
      return result.lastInsertRowid;
    } else {
      db.prepare('UPDATE users SET userName = ?, lastPlayed = ? WHERE userID = ?')
        .run(userName, Math.floor(Date.now() / 1000), user.userID);
      return user.userID;
    }
  }
};

app.post('*splat/database/uploadGJLevel.php', (req, res) => {
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
      unlisted
    } = req.body;

    if (!levelString || !levelName) {
      res.send('-1');
      return;
    }

    console.log(`received level: ${levelName} from ${userName}`);

    const uploadDate = Math.floor(Date.now() / 1000);
    
    const rateLimitCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM levels 
      WHERE userName = ? AND createdAt > ?
    `).get(userName, uploadDate - 60);

    if (rateLimitCheck.count > 0) {
      console.log(`rate limit hit for user: ${userName}`);
      res.send('-1');
      return;
    }

    const existingLevel = db.prepare(`
      SELECT id FROM levels 
      WHERE levelName = ? AND userName = ?
    `).get(levelName, userName);

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
        WHERE id = ? AND userName = ?
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
        userName
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
          udid, userName, levelName, levelDesc, levelString,
          levelVersion, levelLength, audioTrack, gameVersion,
          password, original, twoPlayer, songID, objects,
          coins, requestedStars, auto, isLDM, unlisted,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        udid,
        userName,
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

app.post('*splat/database/getGJLevels.php', (req, res) => {
  try {
    const { type, str, page, diff, len } = req.body;
    const pageNum = parseInt(page) || 0;
    const limit = 10;
    const offset = pageNum * limit;

    let query = 'SELECT * FROM levels';
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
          whereClauses.push('userName = ?');
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

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const levels = stmt.all(...params);

    if (levels.length === 0) {
      res.send('-1');
      return;
    }

    const levelData = levels.map((level) => {
      return `1:${level.id}:2:${level.levelName}:3:${level.levelDesc || ''}:5:${level.levelVersion}:6:${level.userName}:8:${level.difficulty}:9:${level.levelLength}:10:${level.downloads}:12:${level.audioTrack}:13:${level.gameVersion}:14:${level.likes}:17:${level.demon}:43:${level.demonDifficulty}:25:${level.auto}:18:${level.stars}:19:0:42:0:45:0:15:${level.levelLength}:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:0:4:${level.levelString}`;
    }).join('|');

    const userString = levels.map(level => `1:${level.userName}:2:${level.udid}`).join('|');

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
    
    res.send(`${levelData}#${userString}##${totalCount}:${offset}:${limit}#`);
  } catch (error) {
    console.error('error getting levels:', error);
    res.send('-1');
  }
});

app.post('*splat/database/downloadGJLevel.php', (req, res) => {
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

app.post('*splat/database/updateGJLevel.php', (req, res) => {
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

app.post('*splat/database/rateGJLevel.php', (req, res) => {
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

app.post('*splat/database/likeGJLevel.php', (req, res) => {
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

app.post('*splat/database/rateGJDemon.php', (req, res) => {
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

app.post('*splat/database/reportGJLevel.php', (req, res) => {
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

app.post('*splat/database/deleteGJLevelUser.php', (req, res) => {
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

app.post('*splat/database/uploadGJComment.php', (req, res) => {
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

app.post('*splat/database/getGJComments.php', (req, res) => {
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

app.post('*splat/database/likeGJItem.php', (req, res) => {
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

app.get('/api/level/:id', (req, res) => {
  try {
    const levelID = parseInt(req.params.id);
    const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(levelID);
    
    if (!level) {
      res.json({ error: 'Level not found' });
      return;
    }

    res.json({
      id: level.id,
      name: level.levelName,
      author: level.userName,
      description: level.levelDesc,
      version: level.levelVersion,
      difficulty: helpers.getDifficulty(level.difficulty, level.auto, level.demon),
      demonDifficulty: level.demon ? helpers.getDemonDiff(level.demonDifficulty) : null,
      length: helpers.getLength(level.levelLength),
      audioTrack: helpers.getAudioTrack(level.audioTrack),
      gameVersion: helpers.getGameVersion(level.gameVersion),
      downloads: level.downloads,
      likes: level.likes,
      stars: level.stars,
      coins: level.coins,
      objects: level.objects,
      auto: level.auto === 1,
      demon: level.demon === 1,
      createdAt: new Date(level.createdAt * 1000).toISOString(),
      updatedAt: new Date(level.updatedAt * 1000).toISOString()
    });
  } catch (error) {
    console.error('error getting level info:', error);
    res.json({ error: 'internal server error' });
  }
});

app.get('/api/levels', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 20;
    const offset = page * limit;

    const levels = db.prepare(`
      SELECT id, levelName, userName, downloads, likes, levelLength, 
             audioTrack, gameVersion, difficulty, demon, demonDifficulty, 
             stars, auto, createdAt 
      FROM levels 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;

    res.json({
      levels: levels.map(level => ({
        id: level.id,
        name: level.levelName,
        author: level.userName,
        downloads: level.downloads,
        likes: level.likes,
        difficulty: helpers.getDifficulty(level.difficulty, level.auto, level.demon),
        demonDifficulty: level.demon ? helpers.getDemonDiff(level.demonDifficulty) : null,
        stars: level.stars,
        length: helpers.getLength(level.levelLength),
        audioTrack: helpers.getAudioTrack(level.audioTrack),
        gameVersion: helpers.getGameVersion(level.gameVersion),
        createdAt: new Date(level.createdAt * 1000).toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('error getting levels:', error);
    res.json({ error: 'internal server error' });
  }
});

app.use('/*splat', (req, res) => {
  const { method, url, headers, params, query, body } = req;
  const cleanedReq = { method, url, headers, params, query, body };
  console.log("received unimplemented route")
  console.log(JSON.stringify(cleanedReq, null, 2));
  res.send('geometyr');
});

app.listen(3050, () => console.log('server listening on port 3050'));