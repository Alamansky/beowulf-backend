const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function sendJWT(ctx, user) {
  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

  // if env is dev, cookies will be sent with sameSite: "Lax", secure: false
  // if env is prod, cookies will be sent with sameSite: "None", secure: true
  ctx.response.cookie("token", token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 * 52,
    sameSite: process.env.NODE_ENV == "dev" ? "Lax" : "None",
    secure: process.env.NODE_ENV == "dev" ? false : true,
  });
};
