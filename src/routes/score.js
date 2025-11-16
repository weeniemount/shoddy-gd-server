import db from '../db.js'
import express from 'express';
import helpers from '../helpers.js';
const scoreRouter = express.Router();

scoreRouter.post('*splat/database/updateGJUserScore.php', (req, res) => {
  try {
    const {
      udid,
      userName,
      secret,
      stars,
      demons,
      icon,
      color1,
      color2,
      gameVersion,
      binaryVersion,
      coins,
      iconType,
      userCoins,
      special,
      accIcon,
      accShip,
      accBall,
      accBird,
      accDart,
      accRobot,
      accGlow,
      accSpider,
      accExplosion,
      diamonds,
      moons,
      color3,
      accSwing,
      accJetpack,
      accountID
    } = req.body;

    if (!userName) {
      res.send('-1');
      return;
    }

    console.log(`updating user score for: ${userName}`);

    const uploadDate = Math.floor(Date.now() / 1000);
    
    const extID = accountID || udid || 'guest';
    const userID = helpers.getUserID(extID, userName);

    const stmt = db.prepare(`
      UPDATE users 
      SET userName = ?,
          icon = ?,
          color1 = ?,
          color2 = ?,
          color3 = ?,
          iconType = ?,
          special = ?,
          coins = ?,
          userCoins = ?,
          stars = ?,
          demons = ?,
          diamonds = ?,
          moons = ?,
          lastPlayed = ?
      WHERE userID = ?
    `);
    
    stmt.run(
      userName,
      parseInt(icon) || 1,
      parseInt(color1) || 0,
      parseInt(color2) || 3,
      parseInt(color3) || 0,
      parseInt(iconType) || 0,
      parseInt(special) || 0,
      parseInt(coins) || 0,
      parseInt(userCoins) || 0,
      parseInt(stars) || 0,
      parseInt(demons) || 0,
      parseInt(diamonds) || 0,
      parseInt(moons) || 0,
      uploadDate,
      userID
    );

    console.log(`user ${userName} updated successfully`);
    res.send(userID.toString());
  } catch (error) {
    console.error('error updating user score:', error);
    res.send('-1');
  }
});

scoreRouter.post('*splat/database/getGJScores.php', (req, res) => {
  try {
    const { type, udid, accountID, gameVersion, count } = req.body;
    
    console.log(`getting leaderboard: ${type}`);

    let lbstring = "";
    let users = [];
    let position = 0;

    switch(type) {
      case 'top':
        users = db.prepare(`
          SELECT userID, userName, icon, color1, color2, color3, iconType, 
                 special, extID, stars, creatorPoints, demons, coins, 
                 userCoins, diamonds, moons
          FROM users
          WHERE stars > 0
          ORDER BY stars DESC
          LIMIT 100
        `).all();
        break;

      case 'creators':
        users = db.prepare(`
          SELECT userID, userName, icon, color1, color2, color3, iconType, 
                 special, extID, stars, creatorPoints, demons, coins, 
                 userCoins, diamonds, moons
          FROM users
          WHERE creatorPoints > 0
          ORDER BY creatorPoints DESC
          LIMIT 100
        `).all();
        break;

      case 'relative':
        const extID = accountID || udid || 'guest';
        const currentUser = db.prepare(`
          SELECT stars FROM users WHERE extID = ?
        `).get(extID);

        if (!currentUser) {
          res.send('-1');
          return;
        }

        const limitCount = parseInt(count) || 50;
        const halfCount = Math.floor(limitCount / 2);

        users = db.prepare(`
          SELECT * FROM (
            SELECT userID, userName, icon, color1, color2, color3, iconType, 
                   special, extID, stars, creatorPoints, demons, coins, 
                   userCoins, diamonds, moons
            FROM users
            WHERE stars <= ?
            ORDER BY stars DESC
            LIMIT ?
          )
          UNION
          SELECT * FROM (
            SELECT userID, userName, icon, color1, color2, color3, iconType, 
                   special, extID, stars, creatorPoints, demons, coins, 
                   userCoins, diamonds, moons
            FROM users
            WHERE stars > ?
            ORDER BY stars ASC
            LIMIT ?
          )
          ORDER BY stars DESC
        `).all(currentUser.stars, halfCount, currentUser.stars, halfCount);

        const rankQuery = db.prepare(`
          SELECT COUNT(*) + 1 as rank
          FROM users
          WHERE stars > ?
        `).get(currentUser.stars);
        
        position = rankQuery.rank - 1;
        break;

      case 'friends':
        const friendExtID = accountID || udid || 'guest';
        users = db.prepare(`
          SELECT userID, userName, icon, color1, color2, color3, iconType, 
                 special, extID, stars, creatorPoints, demons, coins, 
                 userCoins, diamonds, moons
          FROM users
          WHERE extID = ?
        `).all(friendExtID);
        break;

      default:
        res.send('-1');
        return;
    }

    if (users.length === 0) {
      res.send('-1');
      return;
    }

    users.forEach((user, index) => {
      const rank = type === 'relative' ? position + index + 1 : index + 1;
      const extIDValue = (user.extID && !isNaN(user.extID)) ? user.extID : 0;
      
      lbstring += `1:${user.userName}:2:${user.userID}:13:${user.coins || 0}:17:${user.userCoins || 0}:6:${rank}:9:${user.icon || 1}:10:${user.color1 || 0}:11:${user.color2 || 3}:51:${user.color3 || 0}:14:${user.iconType || 0}:15:${user.special || 0}:16:${extIDValue}:3:${user.stars || 0}:8:${Math.round(user.creatorPoints || 0)}:4:${user.demons || 0}:7:${extIDValue}:46:${user.diamonds || 0}:52:${user.moons || 0}|`;
    });

    lbstring = lbstring.slice(0, -1);
    
    console.log(`returning ${users.length} leaderboard entries`);
    res.send(lbstring);
  } catch (error) {
    console.error('error getting leaderboard:', error);
    res.send('-1');
  }
});

scoreRouter.post('*splat/database/getGJCreators.php', (req, res) => {
  try {
    console.log('getting top creators');

    const users = db.prepare(`
      SELECT userID, userName, icon, color1, color2, color3, iconType, 
             special, extID, stars, creatorPoints, demons, coins, 
             userCoins, diamonds, moons
      FROM users
      WHERE isCreatorBanned = 0
      ORDER BY creatorPoints DESC
      LIMIT 100
    `).all();

    if (users.length === 0) {
      res.send('-1');
      return;
    }

    let pplstring = "";
    
    users.forEach((user, index) => {
      const rank = index + 1;
      const extIDValue = (user.extID && !isNaN(user.extID)) ? user.extID : 0;
      
      pplstring += `1:${user.userName}:2:${user.userID}:13:${user.coins || 0}:17:${user.userCoins || 0}:6:${rank}:9:${user.icon || 1}:10:${user.color1 || 0}:11:${user.color2 || 3}:14:${user.iconType || 0}:15:${user.special || 0}:16:${extIDValue}:3:${user.stars || 0}:8:${Math.round(user.creatorPoints || 0)}:4:${user.demons || 0}:7:${extIDValue}:46:${user.diamonds || 0}|`;
    });

    pplstring = pplstring.slice(0, -1);
    
    console.log(`returning ${users.length} creators`);
    res.send(pplstring);
  } catch (error) {
    console.error('error getting creators:', error);
    res.send('-1');
  }
});

export default scoreRouter;