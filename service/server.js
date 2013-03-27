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
,	AppRouter
=	require(base_lib+'router.js')(
	_
	,	hal
	,	hal_builder
	,	collection_builder
	,	parseUri
	,	Q
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
,	app_router
=	new AppRouter(assoc_transforms,store,transforms,config.server)
,	router
=	app_router.get_router()

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
		if	(req.url == config.server.base+config.application.user_login)
		{
			if (_.isEmpty(req.body))
				res.end(
					JSON.stringify(
						{
							code: '400'
						,	msg: 'Emtpy Body'
						}
					)
				)
			else
			{
				req.session.login_data
				=	req.body
				req.session
				console.log(req.session)
				store
					.find(
						'user'
					,	{
							"key":"username"
						,	"value":req.body.username
						}
					)
					.then(
						function(result)
						{
							result.items
							.then(
								function(user)
								{
									res.end(
										JSON.stringify(
											_.isUndefined(user)
											?	{
													code: '400'
												,	msg: 'Unknown Username'
												}
											:	(user.password == req.body.password)
												?	user
												:	{
														code: '400'
													,	msg: 'Wrong Password'
													}
										)
									)
								}
							)
						}
					)
			}
		}
		else
		{
			if (req.url == config.server.base+config.application.user_logout)
			{
				console.log(req.session)
				req
					.session
						.destroy(
							function(error)
							{
								if	(_.isUndefined(error))
									res
										.end(
											JSON.stringify(
												{
													code: '200'
												,	msg: 'session destroyed'
												}
											)
										)
								else
									logger.warning(error)
							}
						)
			}
			else
			{
				logger.notice("Incomming request from <<"+req.connection.remoteAddress+">>. <<"+req.method+">> "+config.server.protocol+"://"+config.server.host+":"+config.server.port+req.url)
				res.writeHead(
					200
				,	config.header
				)
				router(
					req.method
				,	config.server.protocol+"://"+config.server.host+":"+config.server.port+req.url
				,	req.body
				)
				.then(
					function(result)
					{
						if(_.isObject(result))
						{
							res.end(
								JSON.stringify(
									_.isUndefined(result.error)
									?	result.get_document()
									:	result
								)
							)
							app_router
								.clear_register()
						}
						else
						{
							res.writeHead(result, {"Content-Type": "text/plain"});
							res.end();
						}
					}
				)
			}
		}
	}
)
.listen(
	config.server.port
)
