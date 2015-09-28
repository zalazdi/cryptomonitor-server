var https = require('https');
var EventEmitter = require('events').EventEmitter;

var CoinsE = function(base, alt) {
	this.name = "Coins-E";
	this.base = base;
	this.alt = alt;
	this.lastId = 0;

	this.url = "https://www.coins-e.com/api/v2/market/";
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

		this.url += this.getBase() + "_" + this.getAlt() + "/trades/";
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

	  						if (response.status == true) {
			  					fetcher.parseTrades(response.trades, callback);
			  				}
			  				else {
			  					callback("Error " + response.message);
			  				}
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

			if (trade.id == this.getLastId())
				break;

			this.emit('new trade', {
				id: trade.id,
				price: parseFloat(trade.rate),
				baseTraded: (parseFloat(trade.quantity)),
				altTraded: (parseFloat(trade.rate) * parseFloat(trade.quantity)).toFixed(8),
				date: new Date(trade.created * 1000)
			});
		}

		this.setLastId(trades[trades.length-1].id);

		callback(false);
	}
}

CoinsE.prototype.__proto__ = EventEmitter.prototype;

module.exports = CoinsE;