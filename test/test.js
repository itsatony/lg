var LG = require('../lib/lg.js');

var log = new LG(
	{
		log2console: true,
		log2file: true,
		logfile: __dirname + '/log.txt',
		rules: {
			filterLogLevel: function(config, logTarget, content, sender, logLevel) {
				return (logLevel > 2);
			}
		}
	}
);

log.on('log', function(data) { console.log('---event', data); } );

log.add('this is message #1', 'cyan', 'byTestSender', 3);
log.add('this is a message #2, but too low level to get logged', 'yellow', 'byTestSender', 0);
log.add('this is a message #3', 'cyan', 'byTestSender', 100);