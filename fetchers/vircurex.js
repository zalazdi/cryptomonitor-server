var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('vircurex');

var Vircurex = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Vircurex");
	this.setLastId(1);
	//this.setUrl("http://pubapi.cryptsy.com/api.php?method=markettrades&marketid=");
	this.setTimeout(1000);
	this.setCollection(collection);

	this.client = new client('', {});

	this.ticker = function(callback) {
	    this.client.getTrades(this.getBase(), this.getAlt(), this.getLastId(), function(err, data) {
	    	if(err) 
	    		this.emit('error', err.msg);
	    	else
	     		this.parseTrades(data);
	    }.bind(this));

	    this.client.getOrders(this.getBase(), this.getAlt(), function(err, data) {
	    	if(err) 
	    		this.emit('error', err.msg);
	    	else {
	    		this.parseOrders(data['bids'], "buy");
	    		this.parseOrders(data['asks'], "sell");
	    	}
	    }.bind(this));

    	this.emit('tick');
    	callback();
	}

	this.parseTrades = function(trades) {
		for(i in trades) {
		 	var trade = trades[i];

			if (trade.tid > this.getLastId() && parseFloat(trade.price) != 0) {
				this.setLastId(trade.tid);
				this.newTrade({
					id: trade.tid,
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

module.exports = Vircurex;