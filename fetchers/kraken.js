var Fetcher = require('../fetcher.js'),
	EventEmitter = require('events').EventEmitter,
	client = require('kraken-api');

var Kraken = function(base, alt, collection) {
	this.__proto__ = new Fetcher();

	this.setBase(base);
	this.setAlt(alt);
	this.setName("Kraken");
	this.setLastId(0);
	//this.setUrl();
	this.setTimeout(5000);
	this.setCollection(collection);

	this.client = new client();

	this.getBaseKraken = function() {
		if(this.base == "DOGE")
			return "XDG";
		if(this.base == "BTC")
			return "XBT";

		return this.base;
	}

	this.getAltKraken = function() {
		if(this.alt == "DOGE")
			return "XDG";
		if(this.alt == "BTC")
			return "XBT";

		return this.alt;
	}

	this.ticker = function(callback) {
		this.client.api('Trades', { 'pair':  this.getAltKraken() + this.getBaseKraken(), 'since': this.getLastId() }, function(err, data) {
			if(err) this.emit('error', err);
			else {
				this.parseTrades(data.result);
			}

			this.emit('tick');
		 	callback();
		}.bind(this));

		this.client.api('Depth', { 'pair': this.getAltKraken() + this.getBaseKraken() }, function(err, data) {
			if(err) this.emit('error', err);
			else {
				var result = data.result[Object.keys(data.result)[0]];
				
				this.parseOrders(result.asks, "buy");
				this.parseOrders(result.bids, "sell");
			}
		}.bind(this));
	}

	this.parseTrades = function(data) {
		var trades = data[Object.keys(data)[0]];

		for(i in trades) {
		 	var trade = trades[i];

		 	var id = (trades.length-1 == i ? data.last : null);
		 	var price = parseFloat(parseFloat(1 / trade[0]).toFixed(8));
		 	var quantity = parseFloat(trade[0] * trade[1]);
		 	var date = new Date(trade[2]*1000);

			this.newTrade({
				id: id,
				price: price,
				baseTraded: quantity,
				altTraded: trade[1],
				date: date
			});
		}
		
		this.setLastId(data.last);
	}

	this.parseOrders = function(orders, type) {
		var newOrders = [];

		// Iteration for all new orders
		for(i in orders) {
			var order = orders[i];

			var price = parseFloat(1 / order[0]).toFixed(8);
			var quantity = parseFloat(order[0] * order[1]);

			if(newOrders[price])
				newOrders[price] += quantity;
			else
				newOrders[price] = quantity;
		}

		this.compareOrders(newOrders, type);
	}
}

module.exports = Kraken;