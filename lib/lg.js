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
	
	// simple logging
	log.add('this is a message', 'cyan', 'byTestSender');
	
	// --- USING LOG-RULES
	// this is a blackList, meaning that the first rule returning false will stop logging.
	config.rules = {
		filterLogLevelForDB: function(config, logTarget, content, sender, logLevel) {
			if (logTarget !== 'db') return true;
			return (logLevel < 3);
		}
	};
*/

var fs = require('fs');
var mongodb = require('mongodb');
var Minions = require('minions');
var nJSON = require('njson');
njsonClient = nJSON.client();
minions = new Minions(['node']);


var aLogger = function(newConfig, postInitCall) {
	var thisLogger = this;
	this.version = '0.4.1';
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
		interceptConsoleCallback: function() { return true; },
		rules: {
			minLogLevel: function(config, logTarget, content, sender, logLevel) {
				if (logLevel > thisLogger.config.logLevel) return false;
				return true;
			}
		}
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
	if (typeof thisLogger.config.logLevel !== 'number') {
		thisLogger.config.logLevel = (typeof thisLogger.config.loglevel === 'number' ? thisLogger.config.loglevel : 0);
	}
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
		this.db.server = new mongodb.Server(
			this.config.database.ip, 
			this.config.database.port, 
			this.config.database.options, 
			{safe:false}
		);
		this.db.client = new mongodb.Db(this.config.database.name, this.db.server, {safe:false});
		var myClient = this.db.client;
		myClient.open(function (error, p_client) {
			if (error) throw error;
			thisLogger.collection = new mongodb.Collection(myClient, thisLogger.config.database.collection);
			if (typeof postInitCall === 'function') {
				postInitCall(thisLogger);
			}
		});
	}	else {
		if (typeof postInitCall === 'function') {
			postInitCall(thisLogger);
		}
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
	var args = thisLogger.getModifiedLoggingParameters(message, type, sender, options);
	message = args.message;
	type = args.type;
	sender = args.sender;
	messageLevel = args.messageLevel;

	var coloredMessage = this.config.colors['moduleName'] 
		+ '[' + sender + '] ' 
		+ this.config.colors[type] 
		+ message 
		+ this.config.colors['plain']
	;
	var plainMessage = '[' + sender + '] ' + message;
	var timestamp = (this.config.shortTimeStamp) 
		? 
			Date.now() 
		: 
			new Date().toLocaleString()
	;
	var timestampedMessage = '@' + timestamp + ' [' + sender + '] ' + message;
	var timestampedColoredMessage = '@' + timestamp + ' ' + coloredMessage;
	
	// --- log to database
	if (
		checkLog2Db(this.config, plainMessage, sender, messageLevel) === true
	) {
		var doc = {
			ts: Date.now(),
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
	if (
		checkLog2File(this.config, plainMessage, sender, messageLevel) === true
	) {
		if (typeof this.logfile === 'object') {
			this.logfile.write(timestampedMessage + '\n');
		} else {
			console.log('no file');
		}
	}
	// --- log to console
	if (
		checkLog2Console(this.config, plainMessage, sender, messageLevel) === true
	) {
		console.log(timestampedColoredMessage);
	}	
	return timestampedMessage;
};

aLogger.prototype.getModifiedLoggingParameters = function(message, type, sender, options) {
	// options check
	if (typeof options === 'number') {
		messageLevel = options;
	} else if (typeof options === 'undefined') {
		if (typeof sender === 'number') {
			messageLevel = sender;
		} else if (typeof type === 'number') {
			messageLevel = type;
		} else {
			messageLevel = 0;
		}
	} else if (typeof options === 'object' && typeof options.messageLevel === 'number') {
		messageLevel = options.messageLevel;
	} else {
		messageLevel = 0;
	}

	// sender check
	if (typeof sender !== 'string') {
		if (this.config.messageTypes.indexOf(type) === -1 && typeof type !== 'number') {
			sender = type || 'anonymous';
			type = 'plain';
		} else {
			sender = 'anonymous';
		}
	}
	
	// type check
	if (
		typeof type !== 'string' 
		|| this.config.messageTypes.indexOf(type) === -1
	) {
		type = 'plain';
	}	

	// message check
	if (typeof message !== 'string' && typeof message === 'object') {
		var msgDir = '{\n';
		var spaces = '  ';
		for (var i in message) {
			if (
				typeof message[i] === 'string' 
				|| typeof message[i] === 'number' 
				|| typeof message[i] === 'boolean'
			) {
				msgDir += spaces + '' + i + ': ' + message[i] + '\n';
			} else if (message[i] !== 'object') {
				for (var y in message[i]) {
					if (
						typeof message[i][y] === 'string' 
						|| typeof message[i][y] === 'number' 
						|| typeof message[i][y] === 'boolean'
					) {
						msgDir += spaces + spaces + '' + i + ': ' + message[i] + '\n';
					}
				}
			}
		}
		msgDir += '}\n';
		message = msgDir;
	}

	return {
		message: message,
		type: type,
		sender: sender,
		messageLevel: messageLevel
	};
};

aLogger.prototype.trace = function(message, type, sender) {
	return this.add(message, type, sender, 5);
}

aLogger.prototype.debug = function(message, type, sender) {
	return this.add(message, type, sender, 4);
}

aLogger.prototype.info = function(message, type, sender) {
	return this.add(message, type, sender, 3);
}

aLogger.prototype.warn = function(message, type, sender) {
	return this.add(message, type, sender, 2);
}

aLogger.prototype.error = function(message, type, sender) {
	return this.add(message, type, sender, 1);
}

aLogger.prototype.njson = function(data, id, replaceBuffer) {
	var uid = (typeof id==='string' && id.length === 45) 
		? 
			id 
		: 
			'lg' + minions.randomString(30, true, true, true)
	;
	var url = 'http://' + 'njson.itsatony.com' + ':' + '80' + '/?id=' + uid;
	var send = njsonClient(
		data,
		url,
		replaceBuffer,
		function(result, response) {
		}
	);
	return this.add('sent data to njson. view @ ' + url, 'cyan', 'njson', 3);
}

function checkLog2Db(config, content, sender, logLevel) {
	if (config.log2database === false) {
		return false;
	}
	for (var n in config.rules) {
		if (config.rules[n](config, 'db', content, sender, logLevel) === false) {
			return false;
		}
	}
	return true;
};
function checkLog2Console(config, content, sender, logLevel) {
	if (config.log2console === false) {
		return false;
	}
	for (var n in config.rules) {
		if (config.rules[n](config, 'console', content, sender, logLevel) === false) {
			return false;
		}
	}
	return true;
};
function checkLog2File(config, content, sender, logLevel) {
	if (config.log2file === false) {
		return false;
	}
	for (var n in config.rules) {
		if (config.rules[n](config, 'file', content, sender, logLevel) === false) {
			return false;
		}
	}
	return true;
};


module.exports = aLogger;
console.log('[aLogger] module loaded.');
