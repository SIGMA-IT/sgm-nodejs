//	ASYNC
var Q
=	require('q')
//require('amd-loader')
var	config
=	require('./config.js')()
if(!config)
	throw new Error("config.js not loaded")
var	defaults
=	require('./default.js')()
,	base_lib
=	config.paths.lib
,	server_log
=	config.paths.server_log
,	base_pub
=	config.paths.public
,	connect
=	require('connect')
,	path
=	require('path')
,	fs
=	require('fs')
,	fsExists
=	fs.existsSync || path.existsSync
,	program
=	require('commander')
		.version('0.0.1')
		.option(
				'-i, --input <path>'
			,	'input dir to find json data [./data/json]'
			,	String
		)
		.option('-m, --mappings <mappings.json>'
			,	'mappings fields in csv data [./mappings.json]'
			,	String
		)
		.option(
				'-t, --transforms <transforms.json>'
			,	'linking and embeding transforms [./specs/transforms.json]'
			,	String
		)
		.option(
				'-p, --port <3003>'
			,	'port [3003]'
			,	Number
			,	3003
		)
		.parse(process.argv)
var	_
=	require('underscore')
var	Overscore
=	require(base_lib+'overscore.js')(_)
//parseUri------------------------------------------
	eval(fs.readFileSync(base_lib+'parseuri.js')+'')
//---------------------------------------------------
var	Colour
=	require('coloured')
,	Log
=	require('log')
,	fs_log_stream
=	fs.createWriteStream(server_log)
,	ServerLog
=	require(base_lib+'logger.js')(
		_
	,	Log
	,	Colour
	,	fs_log_stream
	)
,	logger
=	new ServerLog()
,	hal
=	require('hal')	
,	hal_builder
=	require(base_lib+'hal_builder.js').make_hal_builder(_,hal)
,	uritemplate
=	require(base_lib+'uritemplates.js').parse
,	collection_builder
=	require(base_lib+'hal_collection_builder.js').make_collection(_,hal_builder,uritemplate)
,	mappings
=	new Object()
,	transforms
=	new Object()
logger.info("Running NodeJS "+process.version)

var	commander_input
=	_.isUndefined(program.input)
	fsExists(program.input)
	?	require(program.input)
	:	{}
if	(_.isString(program.input) && _.isEmpty(commander_input))
	logger.warning('Program Input: no such file or empty file '+program.input)

var	commander_mappings
=	fsExists(program.mappings)
	?	require(program.mappings)
	:	{}
if	(_.isString(program.mappings) && _.isEmpty(commander_mappings))
	logger.warning('Program Mappings: no such file or empty file '+program.mappings)

var	commander_transforms
=	fsExists(program.transforms)
	?	require(program.transforms)
	:	{}
if	(_.isString(program.transforms) && _.isEmpty(commander_transforms))
	logger.warning('Program Transforms: no such file or empty file '+program.transforms)
if	(_.isUndefined(config.paths.input))
	config.paths.input = new Array()

_.each(
	_.union(
		_.map(
			config.paths.input
		,	function(path)
			{
				if	(fsExists(path+'specs/mappings.json'))
					return	require(path+'specs/mappings.json')
				else
				{
					logger.warning('Program Mapping: no such file '+path+'specs/mappings.json')
					return	{}
				}
			}
		)
	,	[commander_mappings]
	)
,	function(partial)
	{
		_.extend(
			mappings
		,	partial
		)
	}
)

_.each(
	_.union(
		_.map(
			config.paths.input
		,	function(path)
			{
				if	(fsExists(path+'specs/transforms.json'))
					return	require(path+'specs/transforms.json')
				else
				{
					logger.warning('Program Input: no such file '+path+'specs/transforms.json')
					return	{}
				}
			}
		)
	,	[commander_transforms]
	)
,	function(partial)
	{
		_.extend(
			transforms
		,	partial
		)
	}
)

var	SpecTransforms
=	require(base_lib+'spec-transform.js')(
		_
	,	uritemplate
	,	mappings
	,	transforms
	,	defaults
	,	logger
	)
,	AssociationsTransforms
=	require(base_lib+'assoc-transforms.js')(
		_
	,	mappings
	,	transforms
	,	defaults
	,	logger
	)
,	SpecMethods
=	require(base_lib+'spec-methods.js')(
		_
	,	Q
	)
,	AppREST
=	require(base_lib+'rest.js')(
		_
	,	Q
	,	logger
	)
,	SpecBuilders
=	require(base_lib+'spec-builders.js')(
		_
	,	Q
	,	hal_builder
	,	collection_builder
	,	parseUri
	,	logger
	)
,	transforms_input
=	new Object()

_.each(
	transforms
,	function(transform,name)
	{
		if (_.isUndefined(transform.source))
		{
			var	found
			=	_.find(
				_.union(config.paths.input,[program.input])
			,	function(path)
				{
					var full_path
					=	_.contains(config.paths.input,path)
						?	path+'data/json'
						:	path
					return fsExists(
								full_path
							+	'/'
							+	transform.storage.name
							+	'.json'
							)
				}
			)
			var found_path
			=	_.contains(config.paths.input,found)
				?	found+'data/json'
				:	found
			if (_.isString(found))	
				_.extend(
					transforms_input
				,	_.object(
						[name]
					,	[
							found_path
						+	'/'
						+	transform.storage.name
						+	'.json'
						]
					)
				)
			else
				logger.warning('Data Input: no such file '+found_path+'/'+transform.storage.name+'.json')
		}	
	}
)

var	Store
=	require(config.store.path)(_,Q)
,	store
=	new	Store(
		transforms_input
	,	function(what)
		{
		return	JSON
			.parse(
				fs.readFileSync(what,'utf8')
			)
		}
	)	
,	assoc_transforms
=	new AssociationsTransforms(store,transforms)
,	transforms_to_check
=	_.keys(transforms)

while (transforms_to_check.length != 0)
{
	transforms_to_check
	= 	_.difference(
			transforms_to_check
		,	assoc_transforms
				.check_spec(
					transforms[_.first(transforms_to_check)]
				,	_.first(transforms_to_check)
			)
		)
}

var	spec_transforms
=	new SpecTransforms(config.server,transforms)
,	spec_methods
=	new SpecMethods(store,assoc_transforms)
,	REST
=	new AppREST(transforms,spec_methods)

logger.info('Listening to port: '+config.server.port)

connect()
.use(
	connect.logger('dev')
)
.use(
	connect.bodyParser()
)
.use(
	connect.cookieParser()
)
.use(
	connect.session(
		{
			secret: 'develepors loves cats'
		,	cookie:
			{
				maxAge: 1440000
			}
		}
	)
)
.use(
	connect
		.favicon(
			__dirname+base_pub+'favicon.ico'
		)
)
.use(
	function(req,res)
	{
		var	builders
		=	new SpecBuilders(transforms,assoc_transforms,REST,config.server)
		,	requested
		=	req.url.match(RegExp('^'+config.server.base+'(.*)$'))[1].split('/')[1]
		,	req_timeout
		=	setTimeout(
				function()
				{
					builders
						.build_msg(
							config.application.user
						,	{
								type:	'ERROR'
							,	msg:	'Request Timeout: Something went wrong'
							,	code:	408
							}
						).then(
							function(msg)
							{
								res.end(
									JSON.stringify(
										msg.get_document()
									)
								)
							}
						)
				}
			,	1000*20
			)

		res.writeHead(
			200
		,	config.header
		)		

		switch(requested)
		{
			case	config.application.user_login:
				if	(_.isEmpty(req.body))
					builders
						.build_msg(
							config.application.user
						,	{
								type:	'ERROR'
							,	msg:	'Invalid Request: Empty Body'
							,	code:	400
							}
						).then(
							function(msg)
							{
								clearTimeout(req_timeout)
								res.end(
									JSON.stringify(
										msg.get_document()
									)
								)
							}
						)
				else
					if	(_.isUndefined(req.session.login))
						store
							.find(
								config.application.user
							,	_.pick(
									req.body
								,	['query']
								)
							).then(
								function(result)
								{
									builders
										.build(
											config.application.user
										,	Q(result)
										).then(
											function(hal)
											{
												clearTimeout(req_timeout)
												if	(_.isUndefined(hal.get_document().type))
													req.session.login
													=	{
															user: hal.get_document()
														,	status: "success"
														}
												res.end(
													JSON.stringify(
														hal.get_document()
													)
												)
												builders
													.clear_register()
											}
										)
								}
							)
					else
						builders
							.build_msg(
								config.application.user
							,	{
									type:	"ERROR"
								,	msg:	"Invalid Request: I'm a teapot (User Allready Logged In MOTHERFUCKER)"
								,	code:	418
								}
							).then(
								function(msg)
								{
									clearTimeout(req_timeout)
									res.end(
										JSON.stringify(
											msg.get_document()
										)
									)
								}
							)
				break;			
			case	config.application.user_logout:
				if	(_.isUndefined(req.session.login))
					builders
						.build_msg(
							config.application.user
						,	{
								type:	"ERROR"
							,	msg:	"Invalid Request: Session Not Found"
							,	code:	454
							}
						).then(
							function(msg)
							{
								clearTimeout(req_timeout)
								res.end(
									JSON.stringify(
										msg.get_document()
									)
								)
							}
						)
				else
					req
					.session
						.destroy(
							function(error)
							{
								if	(_.isUndefined(error))
									builders
										.build_msg(
											config.application.user
										,	{
												type:	'OK'
											,	msg:	'Session Destroyed'
											,	code:	200
											}
										).then(
											function(msg)
											{
												clearTimeout(req_timeout)
												res.end(
													JSON.stringify(
														msg.get_document()
													)
												)
											}
										)
								else
									builders
										.build_msg(
											config.application.user
										,	{
												type:	'ERROR'
											,	msg:	'Conflict: Unable to destroy current session'
											,	code:	409
											}
										).then(
											function(msg)
											{
												clearTimeout(req_timeout)
												res.end(
													JSON.stringify(
														msg.get_document()
													)
												)
											}
										)
							}
						)
				break;			
			default:
				logger.notice("Incomming request from <<"+req.connection.remoteAddress+">>. <<"+req.method+">> "+config.server.protocol+"://"+config.server.host+":"+config.server.port+req.url)
				if	(	
						_.contains(config.application.no_auth_required,requested)
					||	(
							!_.contains(config.application.no_auth_required,requested)
						&&	!_.isUndefined(req.session.login)
						)
					||	(
							_.isUndefined(config.application)
						||	config.application.enabled == false
						)
					)
					builders
						.router(
							req.method
						,	config.server.protocol+"://"+config.server.host+":"+config.server.port+req.url
						,	req.body
						)
						.then(
							function(result)
							{
								clearTimeout(req_timeout)
								res.end(
									JSON.stringify(
										result.get_document()
									)
								)
								builders
									.clear_register()
							}
						)
				else
					builders
						.build_msg(
							config.application.user
						,	{
								type:	'ERROR'
							,	msg:	'Forbidden: Auth Required'
							,	code:	403
							}
						).then(
							function(msg)
							{
								clearTimeout(req_timeout)
								res.end(
									JSON.stringify(
										msg.get_document()
									)
								)
							}
						)
				break;
		}
	}
)
.listen(
	config.server.port
)
