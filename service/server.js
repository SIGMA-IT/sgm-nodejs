//	ASYNC
var Q
=	require('q')
//require('amd-loader')
var	config
=	require('./config.js')()
,	defaults
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
				'-iapp, --inputapp <path>'
			,	'input dir to find json data [./data/json]'
			,	String
			,	config.paths['app']+'data/json'
		)
		.option('-mapp, --mappingsapp <mappings.json>'
			,	'mappings fields in csv data [./mappings.json]'
			,	String
			,	config.paths['app']+'specs/mappings.json'
		)
		.option(
				'-tapp, --transformsapp <transforms.json>'
			,	'linking and embeding transforms [./specs/transforms.json]'
			,	String
			,	config.paths['app']+'specs/transforms.json'
		)
		.option(
				'-idata, --inputdata <path>'
			,	'input dir to find json data [./data/json]'
			,	String
			,	config.paths['data']+'data/json'
		)
		.option('-mdata, --mappingsdata <mappings.json>'
			,	'mappings fields in csv data [./mappings.json]'
			,	String
			,	config.paths['data']+'specs/mappings.json'
		)
		.option(
				'-tdata, --transformsdata <transforms.json>'
			,	'linking and embeding transforms [./specs/transforms.json]'
			,	String
			,	config.paths['data']+'specs/transforms.json'
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
,	mappingsapp
=	fsExists(program.mappingsapp)
		?require(program.mappingsapp)
		:false
,	transformsapp
=	fsExists(program.transformsapp)
		?require(program.transformsapp)
		:false
,	mappingsdata
=	fsExists(program.mappingsdata)
		?require(program.mappingsdata)
		:false
,	transformsdata
=	fsExists(program.transformsdata)
		?require(program.transformsdata)
		:false
var	mappings
=	new Object()
	_.extend(
		mappings
	,	mappingsapp
	,	mappingsdata
	)
var	transforms
=	new Object()
	_.extend(
		transforms
	,	transformsapp
	,	transformsdata
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
if(!config)
	logger.error('Config: no such file ./config.js')
if(!fsExists(program.inputapp) && !fsExists(program.inputdata))
	logger.error('Program Input: no such file'+!fsExists(program.inputapp) ? program.inputapp : program.inputdata)
if(!fsExists(program.transformsapp) && !fsExists(program.transformsdata))
	logger.error('Program Transforms: no such file'+!fsExists(program.transformsapp) ? program.transformsapp : program.transformsdata)
if(!fsExists(program.mappingsapp) && !fsExists(program.mappingsdata))
	logger.error('Program Mappings: no such file'+!fsExists(program.mappingsapp) ? program.mappingsapp : program.mappingsdata)
if (program.inputapp)
	logger.info('Program Application Input: '+program.inputapp)
if (program.transformsapp)
	logger.info('Program Applicatión Transforms: '+program.transformsapp)
if (program.mappingsapp)
	logger.info('Program Application Mappings: '+program.mappingsapp)
if (program.inputdata)
	logger.info('Program Data Input: '+program.inputdata)
if (program.transformsdata)
	logger.info('Program Data Transforms: '+program.transformsdata)
if (program.mappingsdata)
	logger.info('Program Data Mappings: '+program.mappingsdata)
logger.info('Listening to port: '+config.server.port)

var	Store
=	require(base_lib+'store.js')(_,Q)
,	store
=	new	Store(
		_(transforms)
		.objMap(
			function(transform,name)
			{
			var input
			=	_.isUndefined(
					transformsapp[name]	
				)
				?	program.inputdata
				:	program.inputapp
			return	input
			+	'/'
			+	transform.storage.name
			+	'.json'
			}
		)
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
=	new AppRouter(assoc_transforms,store,transforms)
,	router
=	app_router.get_router()

connect()
.use(
	connect.logger('dev')
)
.use(
	connect.bodyParser()
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
		res.writeHead(
			200
		,	config.header
		)
		router(
			req.method
		,	req.url
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
)
.listen(
	config.server.port
)
