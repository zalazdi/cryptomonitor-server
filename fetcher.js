var	EventEmitter = require('events').EventEmitter,
	http = require('http'),
	https = require('https');

var Fetcher = function(base, alt, collection) {
	this.id = "";
	this.name = "";
	this.base = base;
	this.alt = alt;
	this.lastId = 0;
	this.lastPrice;

	this.url = "";
	this.timeout = 1000;
	this.candlesPerRequest = 500;

	this.sellOrders = {};
	this.buyOrders = {};

	this.collection = collection;

	this.intervals = [
		[1, 0], 
		[5, 0], 
		[15, 0], 
		[30, 0],
		[60, 0],
		[180, 0],
		[720, 0],
		[1440, 0]
	];

	this.setId = function(id) {
		this.id = id;
	}
	this.getId = function() {
		return this.id;
	}

	this.setName = function(name) {
		this.name = name;
	}
	this.getName = function() {
		return this.name;
	}

	this.setBase = function(base) {
		this.base = base;
	}
	this.getBase = function() {
		return this.base;
	}

	this.setAlt = function(alt) {
		this.alt = alt;
	}
	this.getAlt = function() {
		return this.alt;
	}

	this.setLastId = function(lastId) {
		this.lastId = lastId;
	}
	this.getLastId = function() {
		return this.lastId;
	}

	this.setLastPrice = function(lastPrice) {
		this.lastPrice = lastPrice;
	}
	this.getLastPrice = function() {
		return this.lastPrice;
	}

	this.setUrl = function(url) {
		this.url = url;
	}
	this.getUrl = function() {
		return this.url;
	}

	this.setTimeout = function(timeout) {
		this.timeout = timeout;
	}
	this.getTimeout = function() {
		return this.timeout;
	}

	this.setCollection = function(collection) {
		this.collection = collection;
	}
	this.getCollection = function() {
		return this.collection;
	}

	this.getSellOrders = function() {
		var temp = {};
		Object.keys(this.sellOrders)
      		.sort()
      		.forEach(function (k) {
      			temp[k] = this.sellOrders[k];
      		}.bind(this));

		return temp;
	}

	this.getBuyOrders = function() {
		var temp = {};
		Object.keys(this.buyOrders)
      		.sort()
      		.forEach(function (k) {
      			temp[k] = this.buyOrders[k];
      		}.bind(this));

		return temp;
	}

	this.setTicker = function() {
		this.intervals.forEach(function(interval) {
			interval[1] = new Date().getTime();
		});

		this.getCollection()
			.find()
			.sort({ date: -1 })
			.limit(1)
			.toArray(function(err, result) {
				if(err)
					this.emit('error', err);

				if(result.length != 0) {
					this.setLastId(result[0].id);
					this.setLastPrice(result[0].price);
				}

				this.tick();
			}.bind(this)
		);
	}

	this.tick = function() {
		setTimeout(function() {
			this.ticker(function() {
				this.isNewCandle();
				this.tick();
			}.bind(this));
		}.bind(this), this.getTimeout());
	}

	this.isNewCandle = function() {
		this.intervals.forEach(function(interval) {
			var minutes = interval[0];
			var lastTime = interval[1];

			var modulo = (lastTime % (minutes * 60000));

			if(lastTime-modulo + (minutes * 60000) < new Date().getTime()) {
				this.getCollection()
					.find({
						date: { $gt: (new Date(lastTime-modulo)), $lt: (new Date(lastTime-modulo + (minutes * 60000))) }
					})
					.sort({ date: 1 })
					.toArray(function(err, result) {
						if(err)
							this.emit('error', err);

						var candle = false;

						result.forEach(function(trade) {
							var timestamp = trade.date.getTime() - (trade.date.getTime() % (interval*60000));

							if(!candle) {
								candle = [
									new Date(lastTime-modulo),
									trade.price,
									trade.price,
									trade.price,
									trade.price,
									trade.baseTraded
								];
							} else {
								if(candle[2] < trade.price)
									candle[2] = trade.price;
								if(candle[3] > trade.price)
									candle[3] = trade.price;

								candle[4] = trade.price;
								candle[5] += trade.baseTraded;
							}
						});

						if(candle) {
							this.emit('new candle', {
								interval: minutes,
								candle: candle
							});
						}
					}.bind(this)
				);

				interval[1] = new Date().getTime();
			}
		}.bind(this));
	}

	this.newTrade = function(trade) {
		this.getCollection().insert({
			id: trade.id,
			price: trade.price,
			baseTraded: trade.baseTraded,
			altTraded: trade.altTraded,
			date: trade.date
		}, function (err, inserted) {
		    if(err)
		    	this.tick('error', err);
		}.bind(this));

		this.setLastPrice(trade.price);
		this.emit('new trade', trade);
	}

	this.request = function(url, callback, err) {
		if (url.substring(0,5) == "https")
			var protocol = https;
		else if (url.substring(0,4) == "http")
			var protocol = http;

		protocol.get(url, function(res) {
			var responseParts = [];
			res.setEncoding('utf8');

			res.on('data', function(chunk) {
				responseParts.push(chunk);
			});
			res.on('end', function() {
				try {
					if (res.statusCode == 200) {
						var response = JSON.parse(responseParts.join(''));
	  					callback(response, err);
					} else {
						err("Error " + res.statusCode);
					}
				}
				catch(e) {
					err(e);
				}
			});
		});
	}

	this.compareOrders = function(newOrders, type) {
		if(type == "buy")
			var oldOrders = this.buyOrders;
		else
			var oldOrders = this.sellOrders;

		// Iteration for all old orders
		for(price in oldOrders) {
			if(parseFloat(price) == price) {

				// If in new and old array this same price exsists
				if(newOrders[price]) {
					if(newOrders[price] > oldOrders[price]) {
						this.emit('market depth change', {
							type: type,
							change: "increase",
							price: price,
							quantity: newOrders[price]
						});
					}
					
					else if (newOrders[price] < oldOrders[price]) {
						this.emit('market depth change', {
							type: type,
							change: "decrease",
							price: price,
							quantity: newOrders[price]
						});
					}

					oldOrders[price] = newOrders[price];
					delete newOrders[price];
				}

				// If old price is now longer exsits
				else {
					delete oldOrders[price];
					this.emit('market depth change', {
						type: type,
						change: "close",
						price: price
					});
				}
			}
		}

		// For every new price
		for(i in newOrders) {
			var price = i;
			var quantity = newOrders[i];

			oldOrders[i] = quantity;

			this.emit('market depth change', {
				type: type,
				change: "open",
				price: price,
				quantity: newOrders[i]
			});
		}

		if(type == "buy")
			this.buyOrders = oldOrders;
		else
			this.sellOrders = oldOrders;
	}

	this.getChartData = function(interval, callback, max) {
		var modulo = (new Date()).getTime() % (interval * 60000);

		if (!max) {
			var max = new Date( (new Date()).getTime() - modulo );
		}

		var min = new Date( max.getTime() - modulo - this.candlesPerRequest*interval*60000 );

		this.getCollection()
			.find({
				date: { $gt: min, $lt: max }
			})
			.sort({ date: 1 })
			.toArray(function(err, result) {
				if(err)
					this.emit('error', err);

				var candles = [];
				var i = 0;
				var last_date = 0;

				result.forEach(function(trade) {
					var timestamp = trade.date.getTime() - (trade.date.getTime() % (interval*60000));

					if (last_date == 0)
						last_date = timestamp;
					if (last_date != timestamp){
						last_date = timestamp;
						++i;
					}

					if(!candles[i]) {
						candles[i] = [
							new Date(timestamp),
							trade.price,
							trade.price,
							trade.price,
							trade.price,
							trade.baseTraded
						];
					} else {
						if(candles[i][2] < trade.price)
							candles[i][2] = trade.price;
						if(candles[i][3] > trade.price)
							candles[i][3] = trade.price;

						candles[i][4] = trade.price;
						candles[i][5] += trade.baseTraded;
					}
				});

				callback(candles);
			}.bind(this)
		);
	}

	this.getLastTrades = function(callback, limit) {
		if (!limit) var limit = 20;

		this.getCollection()
			.find()
			.sort({ date: -1 })
			.limit(limit)
			.toArray(function(err, results) {
				var trades = [];
				for(i=results.length-1; i>=0; --i) {
					trades[trades.length] = results[i];
				}

				callback(trades);
			}.bind(this));
	}
}

Fetcher.prototype.__proto__ = EventEmitter.prototype;

module.exports = Fetcher;