'use strict';

var http = require('http');
var redis = require('redis');
var async = require('async');

var messagesCount;
var client = redis.createClient({host: '127.0.0.1', port: '6379'});

//take first element from connections list to check its type
client.lpop('connections', function(err, reply) {
	if (reply === 'generator') {
		client.rpush('connections','reciever' , function(err) {
			if (err) {
				console.log(err);
			}
			client.lpush('connections','generator' , function(err) {
				if (err) {
					console.log(err);
				}
			});
		});
		var recieverTimer = setInterval(function() {
			client.rpop('messages', function(err, reply) {
				if (err || !reply) {
					return;
				}
				client.get('last_seen', (err, reply) => {
					var diff = Date.now() - reply;
					if (diff > 500){
						client.set('last_seen', Date.now(), redis.print);
						clearInterval(recieverTimer);
						//не забыть выпилить ресивер
						client.rpop('connections', function(err, reply) {

						});
						generatorCreation();
					}
				});
				eventHandler(reply, (err, msg) => {
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
		}, 300);
	}
	else {
		generatorCreation();
	}
});
function generatorCreation() {
	client.rpop('messages',(err, reply) => {
		messagesCount = reply||0;
		client.rpush('messages', messagesCount, err => {
			if (err) {
				console.log(err);
			}
		});
		var generator = new Generator(messagesCount);
		var message;
		setInterval(function() {
			message = generator.getMessage();
			client.rpush('messages',message , err => {
				if (err) {
					console.log(err);
				}
				client.set('last_seen', Date.now(), redis.print);
			});
		}, 200);
		
		client.lpush('connections','generator' , err => {
			if (err) {
				console.log(err);
			}
		});
	});
}
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