/**
 * Custom middlewares
 */


/**
 * Serve favicon so that calls to /favicon.ico don't pollute the rest of the app
 * esp. sessions (thank you, Express)
 */
module.exports.serveFavicon = function (req, res, next) {
  if (req.url === '/favicon.ico') {
    return res.send(404);   // I will change this once I have a logo for Braindead
  } else {
    return next();
  }
};


