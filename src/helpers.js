import db from './db.js'

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

export default helpers;