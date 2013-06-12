/**
 * Lightweight wrapper around the Stripe API functions I use
 * It also handles caching of Stripe's respones (e.g. customer ids)
 */

var stripe = {}
  , stripeApiUrl = 'https://api.stripe.com/v1'
  , stripeApiToken = process.env.STRIPE_TEST_KEY
  , request = require('request')
  , db = require('./db')
  , _ = require('underscore')
  ;


/**
 * Get a list of all users
 * (in fact we only get 100 users but for this demo I will not have more than 100 customers)
 * @param {Function} callback Signature: err, array of customers
 */
stripe.getAllCustomers = function (callback) {
  request.get({ uri: stripeApiUrl + '/customers?count=100', auth: { username: stripeApiToken } }, function (err, res, data) {
    if (err) { return callback(err); }

    try {
      data = JSON.parse(data)
    } catch (e) {
      return callback({ couldntParseJson: true, badData: data });
    }

    return callback(null, data.data);
  });
};


/**
 * Get a customer's id from his email
 * Since ids don't change we can cache them
 * @param {String} email
 * @param {Function} callback Signature: err, id
 */
stripe.getCustomerIdFromEmail = function (email, callback) {
  db.customers.findOne({ email: email }, function (err, customer) {

    if (err) { return callback(err); }
    if (customer && customer.stripeCustomerId) {
      return callback(null, customer.stripeCustomerId);
    }

    stripe.getAllCustomers(function (err, data) {
      if (err) { return callback(err); }
      customer = _.find(data, function (c) { return c.email === email });

      if (!customer) {
        return callback({ customerNotFound: true });
      } else {
        db.customers.insert({ email: email, stripeCustomerId: customer.id }, function (err) {
          if (err) { return callback(err); }
          return callback(null, customer.id);
        });
      }
    });
  });
};


/**
 * Get Stripe's data about a customer
 * @param {Function} callback Signature: err, data
 */
stripe.getCustomer = function (stripeCustomerId, callback) {
  request.get({ uri: stripeApiUrl + '/customers/' + stripeCustomerId, auth: { username: stripeApiToken } }, function (err, res, data) {
    if (err) { return callback(err); }

    try {
      data = JSON.parse(data);
    } catch (e) {
      return callback({ couldntParseJson: true, badData: data });
    }

    callback(null, data);
  });
};


// Interface
module.exports = stripe;
