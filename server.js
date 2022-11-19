const express = require('express');
require('dotenv').config();
const mysql = require('mysql');
const formidable = require('formidable');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { createTokens, validateToken } = require('./JWT');

const { APP_PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT } =
  process.env;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const db = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  database: DB_DATABASE,
  connectionLimit: 100,
  password: DB_PASSWORD, // password for the new user
  port: DB_PORT,
});

// db.connect((err) => {
//   if (err) {
//     console.log('error in db connection');
//   }
//   console.log('DB connected Successfully');
// });

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log('DB connected successful: ' + connection.threadId);
});

app.post('/file', (req, res) => {
  const form = formidable({ multiples: true });
  form.maxFileSize = 50 * 1024 * 1024; // 5MB
  form.parse(req, async (err, fields, files) => {
    console.log('🚀 ~ file: server.js ~ line 33 ~ form.parse ~ fields', fields);
    console.log(
      '🚀 ~ file: server.js ~ line 33 ~ form.parse ~ files',
      files.attachment
    );

    if (err) {
      console.log('Error parsing the files');
      return res.status(400).json({
        status: 'Fail',
        message: 'There was an error parsing the files',
        error: err,
      });
    }
  });
  res.send('hello');
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (password && email && name) {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.getConnection(async (err, connection) => {
      if (err) throw err;
      const sqlSearch = 'SELECT * FROM users WHERE email = ?';
      const search_query = mysql.format(sqlSearch, [email]);
      const sqlInsert = 'INSERT INTO users VALUES (?,?,?)';
      const insert_query = mysql.format(sqlInsert, [
        name,
        email,
        hashedPassword,
      ]);
      connection.query(search_query, async (err, result) => {
        if (err) throw err;
        if (result.length != 0) {
          console.log('------> User already exists');
          res.status(400).send('User already exists');
          connection.release();
        } else {
          connection.query(insert_query, (err, result) => {
            if (err) {
              return res.status(400).send('error in inserting data');
            }
            console.log('--------> Created new User');
            console.log(result.insertId);
            const message = 'user is registered';
            res.send(message);
            connection.release();
          });
        }
      });
    });
  } else {
    res.status(400).send('All fields are required');
  }
});

app.listen(APP_PORT, () => console.log(`Server is Listening on ${APP_PORT}`));
