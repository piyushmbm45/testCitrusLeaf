const { sign, verify } = require('jsonwebtoken');
require('dotenv').config();

const { JWT_SECRET } = process.env;

const createTokens = ({ name, password, email, id }) => {
  const accessToken = sign({ username: email, id: id }, JWT_SECRET);
  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.cookies['access-token'];

  if (!accessToken)
    return res.status(400).json({ error: 'User not Authenticated!' });

  try {
    const validToken = verify(accessToken, JWT_SECRET);
    if (validToken) {
      console.log(
        '🚀 ~ file: JWT.js ~ line 20 ~ validateToken ~ validToken',
        validToken
      );
      req.authenticated = true;
      req.user_id = validToken.id;
      return next();
    }
  } catch (err) {
    return res.status(400).json({ error: err });
  }
};

module.exports = { createTokens, validateToken };
