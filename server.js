'use strict';

const http = require('http');
const redis = require('redis');

let messagesCount;
const client = redis.createClient({host: '127.0.0.1', port: '6379'});


//тут условие проверки генератора
client.lrange('messages',-100, 100, (err, reply) => {
	console.log(reply);
});
const generator = new Generator(messagesCount);
const message = generator.getMessage();
client.lpush('messages',message , err => {
	if (err) {
		console.log(err);
	}
});
client.lpop('connections', (err, reply) => {
	console.log(reply);
	client.lpush('connections','generator' , err => {
		if (err) {
			console.log(err);
		}
	});
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