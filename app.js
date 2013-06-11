/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , config = require('./lib/config')
  , expressServer
  , middlewares = require('./lib/middlewares')
  , h4e = require('h4e')
  ;


expressServer = express();
expressServer.enable('trust proxy');

//Set up templating
h4e.setup({ baseDir: config.templatesDir
          , toCompileDirs: ['.']
          , extension: 'mustache'
          });

// Middlewares
expressServer.use(middlewares.serveFavicon);
expressServer.use(express.bodyParser());
expressServer.use(express.cookieParser());
expressServer.use(expressServer.router);


/**
 * Routes
 */
expressServer.get('/', function (req, res, next) {
  res.send(200, 'TEST');
});



/**
 * Connect to database, then start server
 */
expressServer.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this
    ;

  self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if Express will want to use this variable!

  // Handle any connection error gracefully
  self.apiServer.on('error', function () {
    return callback("An error occured while launching the server, probably a server is already running on the same port!");
  });

  // Begin to listen. If the callback gets called, it means the server was successfully launched
  self.apiServer.listen.apply(self.apiServer, [config.serverPort, callback]);
};


/**
 * Stop the server
 * No new connections will be accepted but existing ones will be served before closing
 */
expressServer.stopServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer.close(function () {
    console.log('Server was stopped');
    callback();
  });
};



/*
 * If we executed this module directly, launch the server.
 * If not, let the module which required server.js launch it.
 */
if (module.parent === null) {
  expressServer.launchServer(function (err) {
    if (err) {
      console.log("An error occured, logging error and stopping the server");
      console.log(err);
      process.exit(1);
    } else {
      console.log('Workspace found. Server started on port ' + config.serverPort);
    }
  });
}


