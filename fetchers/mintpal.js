var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('mintpaljs');

var Mintpal = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Mintpal");
	this.setLastId(0);
	this.setTimeout(100);
	this.setCollection(collection);

	this.ticker = function(callback) {
	    /*client.getHistory({ CURR_A: this.getBase(), CURR_B: this.getAlt(), TID: this.getLastId() }, function(err, result) {
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
	    }.bind(this));*/

		client.get_trades(this.getBase(), this.getAlt(), function(err, result) {
			if(err) this.emit('error', err);
			else if (result.trades != undefined)
	        	this.parseTrades(result.trades);

	        this.emit('tick');
	        callback();
		}.bind(this));

		client.get_orders(this.getBase(), this.getAlt(), 'BUY', function(err, result) {
			if(err) this.emit('error', err);
			else if (result.orders != undefined)
	    		this.parseOrders(result.orders, "buy");
		}.bind(this));

		client.get_orders(this.getBase(), this.getAlt(), 'SELL', function(err, result) {
			if(err) this.emit('error', err);
			else if (result.orders != undefined)
	    		this.parseOrders(result.orders, "sell");
		}.bind(this));
	}

	this.parseTrades = function(trades) {
		for(i=trades.length-1; i >= 0; --i) {
			var trade = trades[i];
		 	var id = parseInt(trade.time * 10000);

			if (id > this.getLastId()) {
				this.setLastId(id);
				this.newTrade({
					id: id,
					price: parseFloat(trade.price),
					baseTraded: parseFloat(trade.amount),
					altTraded: parseFloat(trade.total),
					date: new Date( parseInt(trade.time * 1000) )
				});
			}
		}
	}

	this.parseOrders = function(orders, type) {
		var newOrders = [];

		// Iteration for all new orders
		for(i=0;i<=orders.length-1;++i) {
			var order = orders[i];
			var price = order.price;

			newOrders[price] = order.amount;
		}


		this.compareOrders(newOrders, type);
	}
}

module.exports = Mintpal;