# lg 

is a super simple logger class for nodeJS. It's part of the VisualWeb Framework (currently not public).
it will log to the console, a (mongoDB) database, a file.
just pass the configuration options when instantiating a new logger and there you go.


		Logger = require('logger');

		var log = new Logger(
			{
				log2console:true,
				rules: {
					minLogLevel: function(config, logTarget, content, sender, logLevel) {
						if (logLevel < 2) return false;
						return true;
					}
				}
			}, 
			function(loggerInstance) { 
				// if you chose log2database, you will need to wait for the callback to be able to actually log... 
			} 
		);

		log.add('this is a message', 'cyan', 'byTest', 2);
	
	