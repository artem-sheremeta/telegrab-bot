const mysql = require("mysql2/promise");

const connectToDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Aa.0912873465",
      database: "telegram-bot_db",
    });

    // console.log("Connect to database");
    return connection;
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err;
  }
};

async function addWordToDatabase(
  userId,
  username,
  words,
  language,
  translation
) {
  const connection = await connectToDatabase();
  try {
    const [existingWord] = await connection.query(
      `SELECT * FROM translations WHERE user_id = ? AND words = ? AND language = ?`,
      [userId, words, language]
    );

    if (existingWord.length === 0) {
      await connection.query(
        `INSERT INTO translations (user_id, username, words, language, translation) VALUES (?, ?, ?, ?, ?)`,
        [userId, username, words, language, translation]
      );
    }
  } catch (error) {
    console.error("Error adding user to database", error);
  } finally {
    await connection.end();
  }
}

async function getWordFromDatabase(userId, language, userContext) {
  const connection = await connectToDatabase();
  try {
    const query = `
    SELECT id, words, translation FROM translations WHERE user_id = ? AND language = ? ORDER BY RAND() LIMIT 1`;
    const [rows] = await connection.query(query, [userId, language]);

    if (rows.length > 0) {
      userContext.wordId = rows[0].id;
      return rows[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching word for learning", error);
    return null;
  } finally {
    await connection.end();
  }
}

async function findWordInDatabase(word, language) {
  const connection = await connectToDatabase();
  try {
    const query = `SELECT id FROM translations WHERE words = ? AND language = ? LIMIT 1`;
    const [rows] = await connection.query(query, [word, language]);
    if (rows.length > 0) {
      return rows[0].id;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error searching word for learning", error);
    return null;
  } finally {
    await connection.end();
  }
}

async function deleteWordFromDatabase(id) {
  const connection = await connectToDatabase();
  try {
    const query = `DELETE FROM translations WHERE id = ?;`;
    await connection.query(query, [id]);
  } catch (error) {
    console.error("Error delete word for learning", error);
    return null;
  } finally {
    await connection.end();
  }
}

module.exports = {
  addWordToDatabase,
  getWordFromDatabase,
  deleteWordFromDatabase,
  findWordInDatabase,
};
