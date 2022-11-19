const express = require('express');
require('dotenv').config();
const mysql = require('mysql');
const formidable = require('formidable');

const { APP_PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT } =
  process.env;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connect = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
});

connect.connect((err) => {
  if (err) {
    console.log('error in db connection');
  }
  console.log('DB connected Successfully');
  app.listen(APP_PORT, () => console.log(`Server is Listening on ${APP_PORT}`));
});

app.post('/file', (req, res) => {
  const form = formidable({ multiples: true });
  form.multiples = true;
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
