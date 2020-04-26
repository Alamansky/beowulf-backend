const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const createServer = require("./server/createServer");
const db = require("./server/db");

const server = createServer();

// TODO use express middleware for cookies and current user
server.express.use(cookieParser());

//decode the JWT so we can get the user ID on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET);
    req.userId = userId;
  }
  next();
});

server.express.use(async (req, res, next) => {
  if (!req.userId) {
    /* // if no userId, create one so user can act as guest
    const guest = await db.mutation.registerGuest(); */
    return next();
  }
  const user = await db.query.user(
    { where: { id: req.userId } },
    "{id, permissions, email, name}"
  );
  req.user = user;
  next();
});

// cors options: https://expressjs.com/en/resources/middleware/cors.html
server.start(
  {
    cors: {
      credentials: true,
      origin: [
        process.env.LOCALHOST,
        process.env.LOCALHOST_PORT,
        process.env.FRONTEND_DO_URL,
        process.env.FRONTEND_NOW_URL,
	process.env.FRONTEND_NOW_TEST_URL,
        process.env.FRONTEND_PROD_IP,
        process.env.FRONTEND_PROD_IP_PORT,
      ],
      allRoutes: true,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
    playground: "/playground",
    endpoint: "/graphql",
  },
  (serverData) => {
    console.log(`server is on port ${serverData.port}`);
  }
);
