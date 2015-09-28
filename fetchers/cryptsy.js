var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('cryptsy-api');

var Cryptsy = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Cryptsy");
	this.setLastId("");
	this.setUrl("http://pubapi.cryptsy.com/api.php?method=markettrades&marketid=");
	this.setTimeout(1000);
	this.setCollection(collection);

	this.client = new client('', '');
	this.marketId;

	this.getMarketId = function(callback) {
		this.client.getmarkets(function(error, markets) {
			var m = [];
			for(var i in markets){
	       		var primary   = markets[i].primary_currency_code;
	        	var secondary = markets[i].secondary_currency_code;

	        	m[primary + secondary] = markets[i].marketid;
	      	}

			if(error)
				this.emit('error', error);
			else {
        		callback(m[this.getBase() + this.getAlt()]);
			}
      	}.bind(this));
	}

	this.ticker = function(callback) {
		if (!this.marketId) {
			this.getMarketId(function(marketId) {
				if(marketId) {
					this.marketId = marketId;
					this.client.markettrades(this.marketId, function(error, trades) {
				    	if(error)
				    		this.emit('error', error);
				    	else
					    	this.parseTrades(trades);
				    }.bind(this));

			    	this.client.marketorders(this.marketId, function(error, orders) {
				    	if(error)
				    		this.emit('error', error);
				    	else {
				    		this.parseOrders(orders['sellorders'], "sell");
				    		this.parseOrders(orders['buyorders'], "buy");
				    	}
			    	}.bind(this));
				}

		    	this.emit('tick');
		    	callback();
			}.bind(this));
		} else {
		    this.client.markettrades(this.marketId, function(error, trades) {
		    	if(error)
		    		this.emit('error', error);
		    	else
		    		this.parseTrades(trades);
		    }.bind(this));

		    this.client.marketorders(this.marketId, function(error, orders) {
		    	if(error)
		    		this.emit('error', error);
		    	else {
			    	this.parseOrders(orders['sellorders'], "sell");
			    	this.parseOrders(orders['buyorders'], "buy");
			    }
		    }.bind(this));

	    	this.emit('tick');
	    	callback();
		}
	}

	this.parseTrades = function(trades) {
		for(i=trades.length-1;i > 0;--i) {
			var trade = trades[i];

			if (trade.tradeid > this.getLastId()) {
				var d1 = (new Date(Date.parse(trade.datetime))),
					d2 = new Date(d1)
					o = d2.getTimezoneOffset();
				
				if (o == -120)
					d2.setMinutes ( d1.getMinutes() + 4*60 - o);
				else
					d2.setMinutes ( d1.getMinutes() + 5*60 - o);

				this.setLastId(trade.tradeid);
				this.newTrade({
					id: trade.tradeid,
					price: parseFloat(trade.tradeprice),
					baseTraded: parseFloat(trade.quantity),
					altTraded: parseFloat(trade.total),
					date: d2
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

//Cryptsy.__proto__ = Fetcher.prototype;

module.exports = Cryptsy;
