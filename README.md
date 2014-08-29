# lg 

is a super simple logger class for nodeJS. It's part of the VisualWeb Framework (currently not public).
it will log to the console, a (mongoDB) database, a file.
just pass the configuration options when instantiating a new logger and there you go.

```
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
			// if you chose log2database, you will need to wait for the
			// callback to be able to actually log... 
		} 
	);

	log.add('this is a message', 'cyan', 'byTest', 2);
```

Loglevels:

error (1):
```
	myLogger.error('Test ERROR message.', 'red', 'examples');
```

warn (2):
```
	myLogger.warn('Test WARN message.', 'yellow', 'examples');
```

info (3):
```
	myLogger.info('Test INFO message.', 'green', 'examples');
```

debug (4):
```
	myLogger.debug('Test DEBUG message.', 'blink', 'examples');
```

trace (5):
```
	myLogger.trace('Test TRACE message.', 'white', 'examples');
```

If you are not sure how to use these loglevels, [here](http://stackoverflow.com/questions/7839565/logging-levels-logback-rule-of-thumb-to-assign-log-levels/8021604#8021604) is a nice description.