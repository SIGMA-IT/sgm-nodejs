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
,	base_pub
=	config.paths.public
var	connect
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
			,	config.paths['sru.api.service']+'data/json'
		)
		.option(	'-m, --mappings <mappings.json>'
			,	'mappings fields in csv data [./mappings.json]'
			,	String
			,	config.paths['sru.api.service']+'specs/mappings.json'
		)
		.option(
				'-t, --transforms <transforms.json>'
			,	'linking and embeding transforms [./specs/transforms.json]'
			,	String
			,	config.paths['sru.api.service']+'specs/transforms.json'
		)
		.option(
				'-p, --port <3003>'
			,	'port [3003]'
			,	Number
			,	3003
		)
		.parse(process.argv)

var	_ //underscore+string
=	require('underscore')
//	_.mixin(require('underscore.string').exports())
var	Overscore
=	require(base_lib+'overscore.js')(_)
	//require('../lib/underscore-data.js')
//parseUri------------------------------------------
	eval(fs.readFileSync(base_lib+'parseuri.js')+'')
//---------------------------------------------------
var	hal
=	require('hal')	
,	hal_builder
=	require(base_lib+'hal_builder.js').make_hal_builder(_,hal)
,	uritemplate
=	require(base_lib+'uritemplates.js').parse
,	collection_builder
=	require(base_lib+'hal_collection_builder.js').make_collection(_,hal_builder,uritemplate)
,	mappings
=	fsExists(program.mappings)
		?require(program.mappings)
		:false
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
,	SpecTransforms
=	require(base_lib+'spec-transform.js')(
		_
	,	uritemplate
	,	mappings
	,	transforms
	,	defaults
	)
,	AssociationsTransforms
=	require(base_lib+'assoc-transforms.js')(
		_
	,	mappings
	,	transforms
	,	defaults
	)
,	AppRouter
=	require(base_lib+'router.js')(
	_
	,	hal
	,	hal_builder
	,	collection_builder
	,	parseUri
	,	Q
	)
if(!config)
	throw 'error: config no exists'
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!transforms)
	throw 'error: '+program.transforms+' no exists'
console.log('transforms: '+program.transforms)
console.log('listening to port: '+config.server.port)
var	Store
=	require(base_lib+'store.js')(_,Q)
,	store
=	new	Store(
		_(transforms)
		.objMap(
			function(transform,name)
			{
			return	program.input
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
				if(_.isObject(result)){
					res.end(
						JSON.stringify(
							result.get_document()
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
