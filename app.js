var clc = require('cli-color'),
	Fetcher = require('./fetcher')
	MongoClient = require('mongodb').MongoClient,
	io = require('socket.io');

var markets = {
	cryptsy: require('./fetchers/cryptsy'),
	mintpal: require('./fetchers/mintpal'),

	// vircurex: require('./fetchers/vircurex'),
	// bter: require('./fetchers/bter'),
	// coinedup: require('./fetchers/coinedup'),
	// anxhk: require('./fetchers/anxhk'),
	// kraken: require('./fetchers/kraken'),
	// poloniex: require('./fetchers/poloniex'),

	//coinex: require('./fetchers/coinex'),
	//coinse: require('./fetchers/coinse'),
}

var fetchers = {
	// White Coin
	cryptsy_wc_btc: {
		fetcher: markets.cryptsy,
		name: "Cryptsy",
		base: "WC",
		alt: "BTC"
	},
	mintpal_wc_btc: {
		fetcher: markets.mintpal,
		name: "Mintpal",
		base: "WC",
		alt: "BTC"
	},

	// Black Coin
	cryptsy_bc_btc: {
		fetcher: markets.cryptsy,
		name: "Cryptsy",
		base: "BC",
		alt: "BTC"
	},
	mintpal_bc_btc: {
		fetcher: markets.mintpal,
		name: "Mintpal",
		base: "BC",
		alt: "BTC"
	},
}

var clients = {};

MongoClient.connect('mongodb://localhost/cryptomonitor', function(err, db) {
	if(err) throw err;
	console.log(clc.cyan("Connected to database"));

	io = io.listen(3000);
	io.set('log level', 1);
	console.log(clc.cyan("Socket.IO listening on 3000 port"));

	/* Fetchers */
	for(id in fetchers) {
		var base = fetchers[id].base;
		var alt = fetchers[id].alt;

		var collection = db.collection(id);
		var fetcher = new fetchers[id].fetcher(base, alt, collection);

		fetchers[id].fetcher_object = fetcher;

		fetcher.setId(id);
		fetcher.setTicker();

		fetcher.on('new trade', function(trade) {
			console.log(
				clc.green.bold(this.name + " (" + this.base + "/" + this.alt + ") ") +
				clc.cyan("new trade ") + 
				clc.magenta(trade.baseTraded + " " + this.base) + 
				" for " + 
				clc.yellow(trade.altTraded + " " + this.alt) + 
				clc.cyan(" (" + trade.price.toFixed(8) + ") ") + 
				trade.date.toString()
			);

			getClientsByMarket(this.getId()).forEach(function(client) {
				client.socket.emit('new trade', trade);
			}.bind(this));

			io.sockets.emit('ticker', {
				id: this.getId(),
				base: this.getBase(),
				alt: this.getAlt(),
				price: trade.price
			});
		});
		
		fetcher.on('error', function(error) {
			console.log(clc.red(error));
		});
		
		fetcher.on('tick', function() {
			// console.log(clc.white(this.name + "(" + this.base + "/" + this.alt + ") tick"));
		});

		fetcher.on('market depth change', function(order) {
			var prefix = this.name + " (" + this.base + "/" + this.alt + ") ";

			if(order.change == "close")
				console.log(prefix + "Closed " + order.type + " order: " + order.price);
			else if(order.change == "open")
				console.log(prefix + "New " + order.type + " order: " + order.price + " (" + order.quantity + " " + this.getBase() + ")");
			else if(order.change == "increase")
				console.log(prefix + order.type + " order " + order.price + " increased to " + order.quantity + " " + this.getBase());
			else if(order.change == "decrease")
				console.log(prefix + order.type + " order " + order.price + " decreased to " + order.quantity + " " + this.getBase());
			 	
			getClientsByMarket(this.getId()).forEach(function(client) {
				client.socket.emit('market depth change', order);
			}.bind(this));
		});

		fetcher.on('new candle', function(candle) {
			getClientsByMarket(this.getId(), candle.interval).forEach(function(client) {
				client.socket.emit('new candle', candle);
			}.bind(this));
		});
	}

	/* Socket.IO */
	io.sockets.on('connection', function (socket) {
		clients[socket.id] = {
			socket: socket
		};

		console.log(clc.yellow("Client " )+ clc.green(socket.id) + clc.yellow(" connected!"));
		var markets = [];
		for(id in fetchers) {
			var fetcher = fetchers[id].fetcher_object;

			markets.push({
				id: fetcher.getId(),
				name: fetcher.getName(),
				base: fetcher.getBase(),
				alt: fetcher.getAlt(),
				price: fetcher.getLastPrice()
			});
		}
		socket.emit('markets', markets);

		/* Events */
		socket.on('disconnect', function () {
			delete clients[socket.id];
			console.log(clc.yellow("Client " )+ clc.green(socket.id) + clc.yellow(" disconnected!"));
		});
		socket.on('set market', function(market) {
			console.log(clc.yellow("Client " )+ clc.green(socket.id) + clc.yellow(" set market to " + market));

			clients[socket.id].market = market;

			if(fetchers[market] != undefined) {
				/* Send last trades */
				fetchers[market].fetcher_object.getLastTrades(function(trades) {
					trades.forEach(function(trade) {
						socket.emit('new trade', trade);
					});
				}, 100);

				/* Send market depth */
				socket.emit('sell orders', fetchers[market].fetcher_object.getSellOrders());
				socket.emit('buy orders', fetchers[market].fetcher_object.getBuyOrders());

				var interval = clients[socket.id].interval;

				if(interval != undefined) {
					fetchers[market].fetcher_object.getChartData(interval, function(data) {
						socket.emit('chart', data);
					});
				}
			}
		});
		socket.on('set interval', function(interval) {
			console.log(clc.yellow("Client " )+ clc.green(socket.id) + clc.yellow(" set interval to " + interval));

			/* Send data chart */
			if (clients[socket.id].market) {
				var market = clients[socket.id].market;

				if(fetchers[market] != undefined) {
					fetchers[market].fetcher_object.getChartData(interval, function(data) {
						socket.emit('chart', data);
					});
				}
			}

			clients[socket.id].interval = interval;
		});
	});
});

function getClientsByMarket(market, interval) {
	var matching_clients = [];
	for(i in clients) {
		var client = clients[i];

		if (market == client.market) {
			if (!interval || (interval && interval == client.interval)) {
				matching_clients.push(client);
			}
		}
	};

	return matching_clients;
}
