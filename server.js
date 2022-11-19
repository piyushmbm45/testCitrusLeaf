const express = require('express');
require('dotenv').config();
const mysql = require('mysql');
const formidable = require('formidable');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { createTokens, validateToken } = require('./JWT');
const fs = require('fs');

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
  password: DB_PASSWORD,
  port: DB_PORT,
});

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
      const sqlInsert =
        'INSERT INTO users (name,email,password) VALUES (?,?,?)';
      const insert_query = mysql.format(sqlInsert, [
        name,
        email,
        hashedPassword,
      ]);
      connection.query(search_query, async (err, result) => {
        if (err) throw err;
        if (result.length != 0) {
          res.status(400).send('User already exists');
          connection.release();
        } else {
          connection.query(insert_query, (err, result) => {
            if (err) throw err;
            res.json({ data: 'user is registered' });
            connection.release();
          });
        }
      });
    });
  } else {
    res.status(400).send('All fields are required');
  }
});

app.post('/login', (req, res) => {
  const { password, email } = req.body;
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = 'Select * from users where email = ?';
    const search_query = mysql.format(sqlSearch, [email]);
    connection.query(search_query, async (err, result) => {
      console.log(
        '🚀 ~ file: server.js ~ line 125 ~ connection.query ~ result',
        result
      );
      connection.release();

      if (err) throw err;
      if (result.length == 0) {
        console.log('--------> User does not exist');
        res.status(404).send('User does not exist');
      } else {
        const hashedPassword = result[0].password;
        console.log(
          '🚀 ~ file: server.js ~ line 132 ~ connection.query ~ result',
          result[0].password
        );

        //get the hashedPassword from result
        if (await bcrypt.compare(password, hashedPassword)) {
          console.log('---------> Login Successful');
          const accessToken = createTokens({
            email: result[0].email,
            id: result[0].id,
          });

          res.cookie('access-token', accessToken, {
            maxAge: 60 * 60 * 24 * 30 * 1000, // 30day
            httpOnly: true,
          });
          res.json('LOGGED IN');
        } else {
          res
            .status(400)
            .json({ error: 'Wrong Username and Password Combination!' });
        }
      }
    });
  });
});

app.get('/profile', validateToken, (req, res) => {
  console.log(req.user_id);
  res.json('profile');
});

app.post('/api/create', validateToken, async (req, res) => {
  const id = req.user_id;
  const form = formidable({ multiples: true });
  form.maxFileSize = 50 * 1024 * 1024; // 5MB
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log('Error parsing the files');
      return res.status(400).json({
        status: 'Fail',
        message: 'There was an error parsing the files',
        error: err,
      });
    }
    fs.open(files.attachment.filepath, 'r', function (err, fd) {
      if (err) throw err;

      var buffer = new Buffer.alloc(files.attachment.size);
      fs.read(fd, buffer, 0, 100, 0, function (err, num) {
        if (err) throw err;
        db.getConnection(async (err, connection) => {
          if (err) throw err;
          const sqlInsert =
            'INSERT INTO tasks (title,due_date,user_id,attachment) VALUES (?,?,?,?)';
          const insert_query = mysql.format(sqlInsert, [
            fields.title,
            fields.due_date,
            id,
            buffer,
          ]);
          connection.query(insert_query, (err, result) => {
            if (err) throw err;
            res.json({ data: 'task created' });
            connection.release();
          });
        });
      });
    });
  });
});

app.get('/api/list', validateToken, async (req, res) => {
  const id = req.user_id;

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlInsert = 'SELECT * FROM tasks WHERE user_id = ?';
    const insert_query = mysql.format(sqlInsert, [id]);
    connection.query(insert_query, (err, result) => {
      if (err) throw err;
      res.json(result);
      connection.release();
    });
  });
});

app.listen(APP_PORT, () => console.log(`Server is Listening on ${APP_PORT}`));
