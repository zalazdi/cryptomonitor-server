var https = require('https');
var EventEmitter = require('events').EventEmitter;

var Coinex = function(base, alt) {
	this.name = "Coinex";
	this.base = base;
	this.alt = alt;
	this.lastId = 0;

	this.url = "https://coinex.pw/api/v2/trades";
	this.timeout = 1000;

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

	this.setTicker = function() {
		var fetcher = this;
		var id = 46;

		if (this.getBase() == "DOGE" && this.getAlt() == "BTC") {
			id = 46;
		} else if (this.getBase() == "DOGE" && this.getAlt() == "LTC") {
			id = 49;
		}

		this.url += "?tradePair=" + id;
		this.tick();
	}

	this.tick = function(err) {
		var fetcher = this;
		setTimeout(function() {
			fetcher.getNewTrades(function(err) {
				fetcher.tick();

				if (err)
					fetcher.emit('error', err);
				else
					fetcher.emit('tick');
			});
		}, this.timeout);
	}

	this.getNewTrades = function(callback) {
		var fetcher = this;

		var url = this.url;

		https.get(url, function(res) {
			var responseParts = [];
			res.setEncoding('utf8');

  			res.on('data', function(chunk) {
  				responseParts.push(chunk);
  			});
  			res.on('end', function() {
  				try {
  					try {
  						if (res.statusCode == 200) {
	  						var response = JSON.parse(responseParts.join(''));
			  				fetcher.parseTrades(response.trades, callback);
		  				} else {
		  					callback("Error " + res.statusCode);
		  				}
		  			}
		  			catch(e) {
						callback(e);
		  			}
	  			}
	  			catch(e) {
					callback(e);
	  			}
  			});
		}).on('error', function(e) {
			callback(e);
		});
	}

	this.parseTrades = function(trades, callback) {
		for(i=trades.length-1; i >= 0; --i) {
			var trade = trades[i];

			if (trade.id > this.getLastId()) {
				this.setLastId(trade.id);
				this.emit('new trade', {
					id: trade.id,
					price: parseFloat(trade.rate / 100000000),
					baseTraded: parseFloat(trade.amount / 100000000),
					altTraded: (parseFloat(trade.amount / 100000000) * parseFloat(trade.rate / 100000000)).toFixed(8),
					date: new Date(Date.parse(trade.created_at))
				});
			}
		}

		callback(false);
	}
}

Coinex.prototype.__proto__ = EventEmitter.prototype;

module.exports = Coinex;