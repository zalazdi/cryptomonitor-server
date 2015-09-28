var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('bter');

var Bter = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Bter");
	this.setLastId(0);
	//this.setUrl();
	this.setTimeout(100);
	this.setCollection(collection);

	this.ticker = function(callback) {
	    client.getHistory({ CURR_A: this.getBase(), CURR_B: this.getAlt(), TID: this.getLastId() }, function(err, result) {
	        if(err) this.emit('error', err);
	        else
	        	this.parseTrades(result.data);

	        this.emit('tick');
	        callback();
	    }.bind(this));

	    client.getDepth({ CURR_A: this.getBase(), CURR_B: this.getAlt() }, function(err, result) {
	    	if(err) this.emit('error', err);
	    	else {
	    		this.parseOrders(result.bids, "buy");
	    		this.parseOrders(result.asks, "sell");
	    	}
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

			newOrders[order[0]] = order[1];
		}

		this.compareOrders(newOrders, type);
	}
}

module.exports = Bter;