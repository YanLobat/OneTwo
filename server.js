'use strict';

const http = require('http');
const redis = require('redis');

let messagesCount;
const client = redis
	.createClient({host: '127.0.0.1', port: '6379'})
	.on('error', err => {
		console.log(client.isConnected);
	});
client.monitor(function (err, res) {
    console.log("Entering monitoring mode.");
});

client.on("end", function (time, args, raw_reply) {
	console.log('lol');
    console.log(time + ": " + args); // 1458910076.446514:['set', 'foo', 'bar']
});

//тут условие проверки генератора
client.lpop('connections', (err, reply) => {
	if (reply === 'generator') {
		client.rpush('connections','reciever' , err => {
			if (err) {
				console.log(err);
			}
			client.lpush('connections','generator' , err => {
				if (err) {
					console.log(err);
				}
			});
		});
		setInterval(function() {
			client.rpop('messages', (err, reply) =>{
				if (err) {
					console.log(err);
				}
				eventHandler(reply, (err, msg) => {
					if (!msg) {
						return;
					}
					if (err) {
						client.rpush('errored', reply, (err, reply) => {
							if (err) {
								console.log(err);
							}
						});
					}
					else {
						client.rpush('treated', reply, (err, reply) => {
							if (err) {
								console.log(err);
							}
						});
					}
				});
					
			});
		}, 0);
	}
	else {
		client.rpop('messages',(err, reply) => {
			console.log(reply);
			messagesCount = reply||0;
			client.rpush('messages', messagesCount, err => {
				if (err) {
					console.log(err);
				}
			});
			const generator = new Generator(messagesCount);
			let message;
			setInterval(function() {
				message = generator.getMessage();
				console.log(message);
				client.rpush('messages',message , err => {
					if (err) {
						console.log(err);
					}
				});
			}, 10);
			
			client.lpush('connections','generator' , err => {
				if (err) {
					console.log(err);
				}
			});
		});
	}
});

function Generator(cnt) {
	this.cnt = cnt;
	this.getMessage = function(){
		this.cnt = this.cnt || 0;

		return this.cnt++;

	}
}


function eventHandler(msg, callback){

	function onComplete(){

		var error = Math.random() > 0.85;

		callback(error, msg);

	}

	// processing takes time...

	setTimeout(onComplete, Math.floor(Math.random()*1000));

} 