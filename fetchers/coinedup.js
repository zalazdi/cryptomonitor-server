var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('coinedup');

var CoinedUp = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("CoinedUp");
	this.setLastId(0);
	//this.setUrl("");
	this.setTimeout(1000);
	this.setCollection(collection);

	this.client = new client('public', 'private');

	this.ticker = function(callback) {
	    this.client.trades({ 
	    	market: this.getBase() + "_" + this.getAlt(),
	    	from: this.getLastId()
	    }, function(trades) {
	    	this.parseTrades(trades);

	    	this.emit('tick');
	    	callback();
	    }.bind(this));
	}

	this.parseTrades = function(trades) {
		for(i in trades) {
			var trade = trades[i];

			if(trade.id > this.getLastId()) {
			this.setLastId(trade.id);
				this.newTrade({
					id: trade.id,
					price: parseFloat(trade.rate),
					baseTraded: parseFloat(trade.volume),
					altTraded: (parseFloat(trade.rate) * parseFloat(trade.volume)).toFixed(8),
					date: new Date(trade.time * 1000)
				});
			}
		}
	}

	this.parseOrders = function(orders, type) {
		var newOrders = [];

		// Iteration for all new orders
		for(i=0;i<=orders.length-1;++i) {
			var order = orders[i];

			if(type == "sell")
				var price = order.sellprice;
			else
				var price = order.buyprice;

			newOrders[price] = order.quantity;
		}

		this.compareOrders(newOrders, type);
	}
}

module.exports = CoinedUp;