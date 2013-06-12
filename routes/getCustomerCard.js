var h4e = require('h4e')
  , async = require('async')
  , moment = require('moment')
  , _ = require('underscore')
  , _s = require('underscore.string')
  , stripe = require('../lib/stripe')
  ;


function answerRapportive (req, response) {
  response.status = response.status || 200;
  req.res.send(200, req.query.callback + '(' +  JSON.stringify(response) + ')');
}


// Sum an array
function sum (array) {
  return _.reduce(array, function (memo, n) { return memo + n; }, 0);
}


// Given an array of objects, sum a given field
function sumField (array, field) {
  var res = 0;
  array.forEach(function (i) {
    if (i[field] && typeof i[field] === 'number') { res += i[field]; }
  });
  return res;
}


module.exports = function (req, res, next) {
  var response = {}, values = {};

  if (!req.query.email) { return answerRapportive(req, { status: 400, html: '' }); }

  console.log("==1");

  stripe.getCustomerIdFromEmail(req.query.email, function (err, id) {
    if (err) {
      if (err.customerNotFound) {
        return answerRapportive(req, { status: 404, html: h4e.render('customerNotFound') });
      } else {
        return answerRapportive(req, { status: 500, html: '' });
      }
    }
  console.log("==2");

    async.parallel({
      customer: async.apply(stripe.getCustomer, id)
    , charges: async.apply(stripe.getAllCharges, id)
    }, function (err, data) {
      var created
        , relevantPeriod   // In what period does it make sense to give the average spend per interval? Can be week or month, no less (in that case we won't show periodic data)
        , numberPeriods
        , graphHeight = 50
        , graphData = [], i, max
        ;

      if (err) { return answerRapportive(req, { status: 500, html: '' }); }
  console.log("==3");

      // Total amount charged and refunded
      data.totalCharged = sumField(data.charges, 'amount') / 100;
      data.totalRefunded = sumField(data.charges, 'amount_refunded') / 100;
      data.totalNet = data.totalCharged - data.totalRefunded;

      // Creation date and relevant period
      created = new Date(data.customer.created * 1000);
      values.createdFromNow = moment(created).fromNow();

      if (Date.now() - created.getTime() > 10 * 7 * 24 * 3600 * 1000) {   // 10 weeks
        relevantPeriod = 365 * 24 * 3600 * 1000 / 12;
        values.relevantPeriodNameLy = 'Monthly';
        values.relevantPeriodName = 'month';   // I really need to switch from mustache to something a bit more powerful!
      } else if (Date.now() - created.getTime() > 7 * 24 * 3600 * 1000) {   // 1 week
        relevantPeriod = 7 * 24 * 3600 * 1000;
        values.relevantPeriodNameLy = 'Weekly';
        values.relevantPeriodName = 'week';
      }

      // Net average periodic spend
      if (relevantPeriod) {
        numberPeriods = (Date.now() - created.getTime()) / relevantPeriod;
        data.netAveragePerPeriod = (data.totalCharged - data.totalRefunded) / numberPeriods;
      }

      // Periodic spend graph
      data.charges = _.map(data.charges, function (i) { return { amount: i.amount, amount_refunded: i.amount_refunded, net_amount: i.amount - i.amount_refunded, created: i.created }; });
      for (i = 0; i < Math.ceil(numberPeriods); i += 1) {
        graphData.unshift(sum(_.pluck(_.filter(data.charges, function (c) { return c.created * 1000 <= Date.now() - i * relevantPeriod && c.created * 1000 > Date.now() - (i + 1) * relevantPeriod; }), 'net_amount')));
      }

      // For demo purposes, and since I can't change the creation date of a charge
      // I will spread the spends over time. This is of course completely arbitrary
      for (i = 0; i < graphData.length; i += 1) {
        if (i >= 3) {
          graphData[i - 3] = 0.05 * graphData[i];
          graphData[i - 2] = 0.25 * graphData[i];
          graphData[i - 1] = 0.3 * graphData[i];
          graphData[i] = 0.4 * graphData[i];
        }
      }

      // Use the closest human-readable number greater than max
      data.bestPeriod = _.max(graphData);
      max = Math.floor(Math.log(data.bestPeriod) / Math.log(10));
      max = 5 * Math.pow(10, max - 1);
      max = max * (1 + Math.floor(data.bestPeriod / max));

      graphData = _.map(graphData, function (i, k) {
        var w = 100 / (2 * graphData.length + 1);
        return { net_amount: i
               , height: graphHeight * i / max
               , top: graphHeight * (1 - (i / max))
               , width: w
               , left: w * (2 * k + 1)
               };
      });

      data.averageLineHeight = graphHeight * (1 - data.netAveragePerPeriod * 100 / max);

      data.max = max / 100;   // Display dollars, not cents

      values.graphHeight = graphHeight;
      values.graphData = graphData;

      // Format numbers
      [ 'totalRefunded'
      , 'totalCharged'
      , 'totalNet'
      , 'netAveragePerPeriod'
      , 'bestPeriod'
      , 'averageLineHeight'
      , 'max'].forEach(function (n) {
        values[n] = _s.numberFormat(data[n], 0);
      });

      response.status = 200;
      response.html = h4e.render('customerCard', { values: values });
      return answerRapportive(req, response);
    });
  });
};



