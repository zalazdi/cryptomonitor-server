var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('anxhk');

var ANX = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("ANX");
	this.setLastId(0);
	//this.setUrl();
	this.setTimeout(100);
	this.setCollection(collection);

	this.client = new client();

	this.ticker = function(callback) {
		this.client.trades(this.getBase() + this.getAlt(), function(trades) {
			this.parseTrades(trades);

			this.emit('tick');
			callback();
		}.bind(this));
		this.client.orderbook(this.getBase() + this.getAlt(), function(orders) {
			this.parseOrders(orders.bids, "buy");
			this.parseOrders(orders.asks, "sell");
		}.bind(this));
	}

	this.parseTrades = function(trades) {
		for(i in trades) {
		 	var trade = trades[i];

			if (parseInt(trade.tid) > this.getLastId() && parseFloat(trade.price) != 0) {
				this.setLastId(parseInt(trade.tid));
				this.newTrade({
					id: parseInt(trade.tid),
					price: parseFloat(trade.price),
					baseTraded: parseFloat(trade.amount),
					altTraded: (parseFloat(trade.amount)*parseFloat(trade.price)).toFixed(8),
					date: new Date(trade.date*1000)
				});
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

module.exports = ANX;