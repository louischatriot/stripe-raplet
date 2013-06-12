var h4e = require('h4e')
  , async = require('async')
  , moment = require('moment')
  , _ = require('underscore')
  , stripe = require('../lib/stripe')
  ;


function answerRapportive (req, response) {
  response.status = response.status || 200;
  req.res.send(200, req.query.callback + '(' +  JSON.stringify(response) + ')');
}


module.exports = function (req, res, next) {
  var response = {}, values = {};

  if (!req.query.email) { return answerRapportive(req, { status: 400, html: '' }); }

  stripe.getCustomerIdFromEmail(req.query.email, function (err, id) {
    if (err) {
      if (err.customerNotFound) {
        return answerRapportive(req, { status: 404, html: h4e.render('customerNotFound') });
      } else {
        return answerRapportive(req, { status: 500, html: '' });
      }
    }

    stripe.getCustomer(id, function (err, data)  {
      if (err) { return answerRapportive(req, { status: 500, html: '' }); }

      values.created = new Date(data.created * 1000);
      values.createdFromNow = moment(values.created).fromNow();
      values.id = id;

      response.status = 200;
      response.html = h4e.render('customerCard', { values: values });
      return answerRapportive(req, response);
    });
  });
};
