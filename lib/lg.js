/*
	this is logger. a super simply nodeJS logging tool.
	it will log to the console, a (mongoDB) database, a file.
	just pass the configuration options when instantiating a new logger and there you go.
	
	Logger = require('logger');
	
	var log = new Logger(
		{
			log2console:true
		}, 
		function(loggerInstance) { 
			// if you chose log2database, you will need to wait for the callback to be able to actually log... 
		} 
	);
	
	log.add('this is a message', 'cyan', 'byTest');
	
	
*/

var fs = require('fs');
var mongodb = require('mongodb');
var Minions = require('minions');
minions = new Minions(['node']);


var aLogger = function(newConfig, postInitCall) {
	this.config = {
		messageTypes: [ 
			'plain', 
			'error', 
			'job', 
			'announce', 
			'ngetherMesh',
			'gray',
			'red',
			'purple',
			'cyan',
			'green',
			'yellow',
			'white',
			'bold',
			'italic',
			'underline',
			'blink'
		],
		colors: {	
			gray: '\u001b[;;0m',
			red: '\u001b[31m',
			purple: '\u001b[35m',
			cyan: '\u001b[36m',
			green: '\u001b[32m',
			yellow: '\u001b[1;33;40m',
			white: '\u001b[37m',
			bold: '\u001b[1m',
			italic: '\u001b[3m',
			underline: '\u001b[4m',
			blink: '\u001b[5m',
			plain: '\u001b[;;0m',
			error: '\u001b[31m',
			moduleName: '\u001b[35m',
			announce: '\u001b[36m',
			ngetherMesh: '\u001b[32m',
			job: '\u001b[1;33;40m'
		},
		log2file: false,
		logfile: __dirname + 'logger.log',
		log2database: false,
		database: {
			ip: '127.0.0.1',
			port: 27017,
			name: 'logger',
			collection: 'consoleLog',
			options: {}
		},
		log2console: true,
		interceptConsole: false, // not used yet
		interceptConsoleCallback: function() { return true; }	
	};
	if (typeof newConfig === 'object') {
		minions.extendShallow(false, this.config, newConfig);
	}
	this.init(postInitCall);
	return this;
};


/*
 * method: aLogger.prototype.init
 * 	initializes all features of the LoggerModule instance
 * 
 * returns:
 * 	this - {object} its own instance (for chaining).
 * 
 * */
aLogger.prototype.init = function(postInitCall) {
	var thisLogger = this;
	if (this.config.log2file === true) {
		thisLogger.logfile = fs.createWriteStream(
			thisLogger.config.logfile, 
			{ 
				flags: 'w',
				encoding: 'utf8',
				mode: 0666 
			}
		);
	}
	if (this.config.log2database === true) {
		this.db = {};
		this.db.server = new mongodb.Server(this.config.database.ip, this.config.database.port, this.config.database.options, {safe:false});
		this.db.client = new mongodb.Db(this.config.database.name, this.db.server, {safe:false});
		var myClient = this.db.client;
		myClient.open(function (error, p_client) {
			if (error) throw error;
			thisLogger.collection = new mongodb.Collection(myClient, thisLogger.config.database.collection);
			if (typeof postInitCall === 'function') postInitCall(thisLogger);
		});
	}	else {
		if (typeof postInitCall === 'function') postInitCall(thisLogger);
	}
	return this;
};


/*
 * method: aLogger.prototype.add
 * 	add something to the log
 * 
 *	parameters:
 *		message - {string||object} the text you want to be logged. if an object is passed it will be DIR'd (2 levels deep only!) !
 *		type - {string} default is 'plain'. options are [ 'plain', 'error', 'job' ] (see aLogger.config.messageTypes )
 *		sender - {string} the name of the sending module.
 *		options - {object} additional options... not used yet
 *
 * returns:
 * 	this - {object} its own instance (for chaining).
 * 
 * */
aLogger.prototype.add = function(message, type, sender, options) {
	var thisLogger = this;
	if (typeof sender !== 'string') sender = 'anonymous';
	if (typeof type !== 'string' || this.config.messageTypes.indexOf(type) === -1) type = 'plain';
	
	if (typeof message !== 'string' && typeof message === 'object') {
		var msgDir = '{\n';
		var spaces = '  ';
		for (var i in message) {
			if (typeof message[i] === 'string' || typeof message[i] === 'number' || typeof message[i] === 'boolean') {
				msgDir += spaces + '' + i + ': ' + message[i] + '\n';
			} else if (message[i] !== 'object') {
				for (var y in message[i]) {
					if (typeof message[i][y] === 'string' || typeof message[i][y] === 'number' || typeof message[i][y] === 'boolean') {
						msgDir += spaces + spaces + '' + i + ': ' + message[i] + '\n';
					}
				}
			}
		}
		msgDir += '}\n';
		message = msgDir;
	}
	var coloredMessage = this.config.colors["moduleName"] + '[' + sender + '] ' + this.config.colors[type] + message + this.config.colors['plain'];
	var plainMessage = '[' + sender + '] ' + message;
	var timestamp = new Date();
	var timestampedMessage = '@' + timestamp + ' [' + sender + '] ' + message;
	var timestampedColoredMessage = '@' + timestamp + ' ' + coloredMessage;
	// --- log to database
	if (this.config.log2database === true) {
		var doc = {
			ts: new Date().getTime(),
			msg: plainMessage
		};
		try {
			thisLogger.collection.insert(
				doc, 
				{ safe: false },
				function(err, objects) {
					return true;
				}
			);
		} catch(err) {
			console.log('[Logger] ERROR while writing to database!');
			console.log(err);
		}
	}
	// --- log to file
	if (this.config.log2file === true) {
		if (typeof this.logfile === 'object') {
			this.logfile.write(timestampedMessage + '\n');
		} else {
			console.log('no file');
		}
	}
	// --- log to console
	if (this.config.log2console === true) {
		console.log(timestampedColoredMessage);
	}	
	return timestampedMessage;
};


module.exports = aLogger;
console.log('[aLogger] module loaded.');