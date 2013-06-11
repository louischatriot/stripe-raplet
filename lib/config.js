var config = {}
  , env = process.env.NODE_ENV
  ;

// For now, no config divergence
if (env === 'production') {
  config.serverPort = 2206;
} else {
  config.serverPort = 2206;
}


// Interface
module.exports = config;
