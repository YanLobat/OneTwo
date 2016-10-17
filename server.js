'use strict';

var redis = require('redis');
var async = require('async');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

var client = redis.createClient({host: '127.0.0.1', port: '6379'});

if (argv.getErrors) {
	getErrors();
}
else {
	normalWork();
}

function getErrors() {
	client.lpop('errored', function(err, reply) {
		if (err) {
			throw new Error(err);
		}
		if (reply) {
			fs.appendFileSync('errors.log', reply+'\r\n','utf-8');
			console.log(reply);
			getErrors();
		}
		else {
			process.exit()
		}
	});
}

function normalWork() {
	//take first element from connections list to check its type
	client.lindex('connections', 0, function(err, type) {
		if (type === 'generator') {
			var recieverTimer = setInterval(function() {
				client.get('last_seen', (err, reply) => {
					var diff = Date.now() - reply;
					if (diff > 520){
						client.set('last_seen', Date.now(), function(err) {
							client.lindex('messages',-1, function(err, reply) {
								if (reply) {
									generatorCreation(reply);
								}
								else {
									client.lindex('treated', -1, function(err, reply) {
										generatorCreation(reply);
									});
								}
							});
							
							client.rpop('connections', function(err, reply) {
								if (err) {
									throw new Error(err);
								}
								clearInterval(recieverTimer);
							});
						});
					}
					else {
						async.waterfall([
							function(callback) {
								client.lpop('messages', function(err, reply) {
									if (err) {
										return callback(err);
									}
									if (!reply) {
										return callback(null, null);
									}
									return callback(null, reply);
								});
							},
							function(message, callback) {
								if (message !== null) {
									eventHandler(message, function(err, msg) {
										if (err) {
											client.rpush('errored',msg , function(err, reply) {
												if (err) {
													return callback(err);
												}
												callback(null, msg);
											});
										}
										else {
											client.rpush('treated', msg, function(err, reply) {
												if (err) {
													return callback(err);
												}
												callback(null, msg);
											});
										}
									});
								}
							}
						], function(err, results) {
							if (err) {
								throw new Error(err);
							}

						});
					}
				});
			}, 10);
			client.rpush('connections','reciever' , function(err) {
				if (err) {
					throw new Error(err);
				}
			});
		}
		else {
			//if there is not generator yet or it was broken we will create a new one
			client.lpush('connections','generator' , function(err) {
				if (err) {
					throw new Error(err);
				}
				generatorCreation(0);
			});
			
		}
	});
}


function generatorCreation(count) {
		var generator = new Generator(count);
		var message;
		setInterval(function() {
			async.parallel([
				function(callback) {
					client.set('last_seen', Date.now(), function(err) {	
						callback(null, null);
					});
				},
				function(callback) {
					message = generator.getMessage();
					client.rpush('messages',message , function(err) {
						if (err) {
							throw new Error(err);
						}
					});
				}
			]);
		}, 500);	
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