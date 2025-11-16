import Database from 'better-sqlite3';

const db = new Database('GeometryJump.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userID INTEGER PRIMARY KEY AUTOINCREMENT,
    isRegistered INTEGER DEFAULT 0,
    extID TEXT NOT NULL UNIQUE,
    userName TEXT NOT NULL,
    lastPlayed INTEGER DEFAULT (strftime('%s', 'now')),
    IP TEXT DEFAULT '',
    gameVersion INTEGER DEFAULT 1,
    secret TEXT DEFAULT '',
    icon INTEGER DEFAULT 1,
    color1 INTEGER DEFAULT 0,
    color2 INTEGER DEFAULT 3,
    color3 INTEGER DEFAULT 0,
    iconType INTEGER DEFAULT 0,
    special INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    userCoins INTEGER DEFAULT 0,
    demons INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    creatorPoints INTEGER DEFAULT 0,
    diamonds INTEGER DEFAULT 0,
    moons INTEGER DEFAULT 0,
    accIcon INTEGER DEFAULT 1,
    accShip INTEGER DEFAULT 1,
    accBall INTEGER DEFAULT 1,
    accBird INTEGER DEFAULT 1,
    accDart INTEGER DEFAULT 1,
    accRobot INTEGER DEFAULT 1,
    accGlow INTEGER DEFAULT 0,
    accSpider INTEGER DEFAULT 1,
    accExplosion INTEGER DEFAULT 1,
    accSwing INTEGER DEFAULT 1,
    accJetpack INTEGER DEFAULT 1,
    isBanned INTEGER DEFAULT 0,
    isCreatorBanned INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT NOT NULL,
    userName TEXT NOT NULL,
    userID INTEGER NOT NULL,
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
  CREATE INDEX IF NOT EXISTS idx_levels_userID ON levels(userID);
  CREATE INDEX IF NOT EXISTS idx_userName ON levels(userName);
  CREATE INDEX IF NOT EXISTS idx_udid ON levels(udid);
  CREATE INDEX IF NOT EXISTS idx_levelName_userName ON levels(levelName, userName);
  CREATE INDEX IF NOT EXISTS idx_createdAt ON levels(createdAt);
  CREATE INDEX IF NOT EXISTS idx_difficulty ON levels(difficulty);
  CREATE INDEX IF NOT EXISTS idx_comments_levelID ON comments(levelID);
  CREATE INDEX IF NOT EXISTS idx_comments_userID ON comments(userID);
  CREATE INDEX IF NOT EXISTS idx_actions_likes_item ON actions_likes(itemID, type, ip);
`);

export default db;