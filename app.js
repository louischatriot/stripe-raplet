/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , h4e = require('h4e')
  , request = require('request')
  , async = require('async')
  , _ = require('underscore')
  , config = require('./lib/config')
  , middlewares = require('./lib/middlewares')
  , db = require('./lib/db')
  , expressServer
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
 * Answer a Rapportive request
 */
function answerRapportive (req, response) {
  response.status = response.status || 200;
  req.res.send(200, req.query.callback + '(' +  JSON.stringify(response) + ')');
}


/**
 * Routes
 */
expressServer.get('/', function (req, res, next) {
  var response = {};

  if (!req.query.email) { return answerRapportive(req, { status: 400, html: '' }); }

  async.waterfall([
    // Try to find the Stripe customer id in the nedb cache, and aske the Stripe API if we can't find it
    // The next step will be executed only if a stripe customer id was found for this email address
    // This way is not really optimal (we should perform a full synchro and not only for the given email address)
    // but for the demo this is fine
    function (cb) {
      db.customers.findOne({ email: req.query.email }, function (err, customer) {
        if (err) { return answerRapportive(req, { status: 500, html: '' }); }

        if (customer) { return cb(null, customer.stripeCustomerId); }

        // No customer found, getting back the whole list
        request.get({ uri: 'https://api.stripe.com/v1/customers?count=100', auth: { username: process.env.STRIPE_TEST_KEY } }, function (err, res, obj) {
          if (err) { return answerRapportive(req, { status: 500, html: '' }); }

          try {
            obj = JSON.parse(obj)
          } catch (e) {
            return answerRapportive(req, { status: 400, html: '' });
          }

          obj = _.find(obj.data, function (c) { return c.email === req.query.email });
          if (!obj) {
            return answerRapportive(req, { status: 404, html: 'Stripe user not found' });
          } else {
            db.customers.insert({ email: req.query.email, stripeCustomerId: obj.id }, function (err) {
              if (err) { return answerRapportive(req, { status: 500, html: '' }); }
              return cb(null, obj.id);
            });
          }
        });
      });
    }
    // We got a customer id, let's give back some data about him
    , function (stripeCustomerId, cb) {
      response.status = 200;
      response.html = "<b>STRIPE DATA</b><br>" + stripeCustomerId;
      return answerRapportive(req, response);
    }
  ]);
});



/**
 * Connect to database, then start server
 */
expressServer.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this
    ;

  db.initialize(function (err) {
    if (err) { return callback(err); }

    self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if Express will want to use this variable!

    // Handle any connection error gracefully
    self.apiServer.on('error', function () {
      return callback("An error occured while launching the server, probably a server is already running on the same port!");
    });

    // Begin to listen. If the callback gets called, it means the server was successfully launched
    self.apiServer.listen.apply(self.apiServer, [config.serverPort, callback]);
  });
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


