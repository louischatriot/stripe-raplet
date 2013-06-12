stripe-raplet
=============

A rapportive raplet showing your customers' payment data in GMail: net total payments, weekly/monthly average and a week over week or month over month graph.

For now this is just a demo that needs a lot of setup to work. The goal is to provide this as a service. If you still want to use it on your own:
1) Put your Stripe API key in the environment variable `STRIPE_TEST_KEY`
2) Clone the code and start the server
3) Proxy it with an Nginx that serves it over HTTPS (it won't work in Chrome otherwise). You can use a self-signed certificate
4) Install the raplet to your Rapportive following the doc in this page: http://code.rapportive.com/raplet-docs/
