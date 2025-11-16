import express from 'express';
import helpers from './helpers.js'
import db from './db.js'

import itemRouter from './routes/item.js';
import levelRouter from './routes/level.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", itemRouter);
app.use("/", levelRouter);

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