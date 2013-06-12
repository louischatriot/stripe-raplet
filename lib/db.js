var Nedb = require('nedb')
  , db = {};


db.customers = new Nedb({ filename: 'workspace/customers.db' });
db.customers.ensureIndex({ fieldName: 'email' });


/**
 * Initialize the database (called from within server launch)
 */
db.initialize = function (cb) {
  db.customers.loadDatabase(cb);
};


// Interface
module.exports = db;
