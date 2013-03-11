var	Factory
=	function(
		_
	,	Log
	,	Colour
	,	fs_stream
	)
	{
		return function()
			{
				var colours
				=	new Object()
				,	log
				=	new Log()
				if (!_.isUndefined(fs_stream))
					var	fs_log
					=	new Log('',fs_stream)
				
				colours["EMERGENCY"]	=	{ background: 'red',    foreground: 'yellow', extra: 'bold' }
				colours["ALERT"]		=	{ background: 'yellow', foreground: 'red',    extra: 'bold' }
				colours["CRITICAL"]		= 	{ background: 'yellow', foreground: 'black' }
				colours["ERROR"]		= 	{ foreground: 'red' }
				colours["WARNING"]		=	{ foreground: 'yellow' }
				colours["NOTICE"]		=	{ foreground: 'cyan' }
				colours["INFO"]			=	{ foreground: 'green' }
				colours["DEBUG"]		=	{ }
				colours["KEY"]			=	{ foreground: 'blue' }
				
				var create_coloured_msg
				=	function(level,msg)
					{
						var	message
						=	'['+level+']'
						+ 	Colour.extra('bold')

						while (msg.indexOf('<<') != -1)
						{
							var	join
							=	new Array() 
							,	part_1
							=	msg.substring(0,msg.indexOf('<<'))
							,	part_2
							=	msg.substring(msg.indexOf('>>')+2,msg.length)
							,	inside_part
							=	_.each(
									msg.substring(msg.indexOf('<<')+2,msg.indexOf('>>')).split(':')
								,	function(part)
									{
										join.push(part)
									}
								)
							msg
							=	_.reduce(
									_.union([part_1],join,[part_2])
								,	function(memo,num)
									{
										return	memo
													.concat(
														(_.contains(join,num))
														?	Colour.colourise(num,colours["KEY"])
														:	num
													)
									}
								,	''
								)
						}

						message +=	new Array(20 - message.length).join(' ')

	    				message =	Colour.colourise(message, colours[level])
	    
						message += 	Colour.extra('clear')
								+	'  '
								+	msg
								+	Colour.extra('clear')
								+	'\n'

						return message
					}
				,	create_msg
				=	function(level,msg)
					{
						var	message
						=	'[' + new Date().toUTCString() + ']'
						+	'     '
						+	'['+level+']'

						message +=	new Array(50 - message.length).join(' ')

						message += 	'  '
								+	msg
								+	'\n'

						return message
					}
				,	print_log
				=	function(level,msg)
					{
						var console_message
						=	create_coloured_msg(level,msg)
						,	fs_message
						=	create_msg(level,msg)
						
						if (!_.isUndefined(fs_stream))
							fs_log
								.stream
									.write(fs_message)
						log
							.stream
								.write(console_message)
					}

				this.info
				=	function(msg)
					{
						print_log("INFO",msg)
					}
				this.error
				=	function(msg)
					{
						print_log("ERROR",msg)
						this.critical("Unexpected Error, Please fix them")
					}
				this.warning
				=	function(msg)
					{
						print_log("WARNING",msg)
					}
				this.notice
				=	function(msg)
					{
						print_log("NOTICE",msg)
					}
				this.alert
				=	function(msg)
					{
						print_log("ALERT",msg)
						this.critical("Unexpected Error, Please fix them")
					}
				this.emergency
				=	function(msg)
					{
						print_log("EMERGENCY",msg)
						this.critical("Unexpected Error, Please fix them")
					}
				this.critical
				=	function(msg)
					{
						print_log("CRITICAL",msg)
						throw "Something went wrong"
					}
				this.debug
				=	function(msg)
					{
						print_log("DEBUG",msg)
					}
			}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.OverscoreFactory
	=	Factory
else
	module.exports
	=	Factory
