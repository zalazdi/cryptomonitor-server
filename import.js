var MongoClient = require('mongodb').MongoClient
	http = require('http');

MongoClient.connect('mongodb://localhost/cryptomonitor', function(err, db) {
	db.collection("cryptsy_doge_btc", function(err, col) {
		if(err) throw err;

		insert(db, col);
	});
});

var num = 0;
var n = 0;
function insert(db, col) {
	http.get("http://dogemonitor.com/export.php?num=" + num, function(res) {
		var responseParts = [];
		res.setEncoding('utf8');

		res.on('data', function(chunk) {
			responseParts.push(chunk);
		});
		res.on('end', function() {
			var response = responseParts.join('');

			var trades = response.split("\n");
			for(i in trades) {
				++n;

				var trade = JSON.parse(trades[i]);
				console.log("" + n + " (trade " + trade.id + ")");

				col.insert({
					id: trade.id,
					price: trade.price,
					baseTraded: trade.baseTraded,
					altTraded: trade.altTraded,
					date: new Date(trade.date)
				}, function(err, inserted) {
					if(err) throw console.log(err);
				});
			}

			if(trades.length != 0) {
				num += trades.length;
				insert(db, col);
			} else {
				db.close();
			}
		});
	});
}