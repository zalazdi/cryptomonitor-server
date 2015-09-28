var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('poloniex');

var Poloniex = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Poloniex");
	this.setLastId(0);
	//this.setUrl();
	this.setTimeout(100);
	this.setCollection(collection);

	this.lastTrade = false;

	this.ticker = function(callback) {
		client.trades(this.getAlt() + "_" + this.getBase(), function(trades) {
			this.parseTrades(trades);

			this.emit('tick');
			callback();
		}.bind(this));
		client.orderbook(this.getAlt() + "_" + this.getBase(), function(orders) {
			this.parseOrders(orders.bids, "buy");
			this.parseOrders(orders.asks, "sell");
		}.bind(this));
	}

	this.parseTrades = function(trades) {
		var s = false;

		for(i=trades.length-1;i>=0;--i) {
		 	var trade = trades[i];

		 	var d1 = (new Date(Date.parse(trade.date))),
				d2 = new Date(d1)
				o = d2.getTimezoneOffset();
			d2.setMinutes ( d1.getMinutes() - o);

			var id = Date.parse(trade.date);

			if (s || id >= this.getLastId()) {
			 	if(this.lastTrade == trade || id > this.getLastId()) {
			 		s = true;

			 		this.setLastId(id);
			 		this.lastTrade = trade;

					this.newTrade({
						id: id,
						price: parseFloat(trade.rate),
						baseTraded: parseFloat(trade.amount),
						altTraded: parseFloat(trade.total),
						date: d2
					});
				}
			}
		}
	}

	this.parseOrders = function(orders, type) {
		var newOrders = [];

		// Iteration for all new orders
		for(i=0;i<=orders.length-1;++i) {
			var order = orders[i];

			newOrders[parseFloat(order[0]).toFixed(8)] = parseFloat(order[1]);
		}

		this.compareOrders(newOrders, type);
	}
}

module.exports = Poloniex;