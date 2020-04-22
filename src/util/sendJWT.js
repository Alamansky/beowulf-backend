const jwt = require("jsonwebtoken");

module.exports = function sendJWT(ctx, user) {
  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

  ctx.response.cookie("token", token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 * 52,
    sameSite: "lax"
  });
};
