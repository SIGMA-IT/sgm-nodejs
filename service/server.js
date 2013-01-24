//	ASYNC
var Q
=	require('q')
//require('amd-loader')
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
		.option('-i, --input <path>','input dir to find json data [./data/json]',String,'./data/json')
		.option('-t, --transforms <transforms.json>','linking and embeding transforms [./transforms.json]',String,'./transforms.json')
		.option('-p, --port <8000>','port [8000]',Number,8000)
		.parse(process.argv)

var	_ //underscore+string
=	require('underscore')
//	_.mixin(require('underscore.string').exports())
var	Overscore
=	require('../lib/overscore.js')(_)
	//require('../lib/underscore-data.js')
//parseUri------------------------------------------
	eval(fs.readFileSync('../lib/parseuri.js')+'')
//---------------------------------------------------
var	hal
=	require('hal')	
,	hal_builder
=	require('../lib/hal_builder.js').make_hal_builder(_,hal)
,	uritemplate
=	require('../lib/uritemplates.js').parse
,	collection_builder
=	require('../lib/hal_collection_builder.js').make_collection(_,hal_builder,uritemplate)
,	server_config
=	require('../lib/config.js')()
,	AssociationsTransforms
=	require('../lib/assoc-transforms.js')(_)
,	SpecTransforms
=	require('../lib/spec-transform.js')(
			_
		,	uritemplate
		)
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
,	AppRouter
=	require('../lib/router.js')(
		_
		,	hal
		,	hal_builder
		,	collection_builder
		,	parseUri
		,	Q
	)
if(!server_config)
	throw 'error: server_config no exists'
console.log(server_config)
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!transforms)
	throw 'error: '+program.transforms+' no exists'
console.log('transforms: '+program.transforms)
var	Store
=	require('../lib/store.js')(_)
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
,	spec_transforms
=	new SpecTransforms(server_config,transforms)
,	assoc_transforms
=	new AssociationsTransforms(store,transforms)
,	app_router
=	new AppRouter(assoc_transforms,store,transforms)
,	router
=	app_router.get_router()

connect()
.use(
	connect.logger('dev')
)
.use(
	connect
		.favicon(
			__dirname+'/../public/favicon.ico'
		)
)
.use(
	function(req,res)
	{
		res.writeHead(
			200
		,	{
				"Access-Control-Allow-Origin": "*"
			,	"Access-Control-Allow-Methods": "POST, PUT, GET, DELETE, OPTIONS"
			,	"Access-Control-Max-Age":"0"
			,	"Access-Control-Allow-Headers": "X-Requested-With"
			,	"Content-Type": "text/hal+json"
			}
		);
		router(
			req.url
		)
		.then(
			function(result)
			{
				if(_.isObject(result))
					res.end(
						JSON.stringify(
							result.get_document()
						)
					)
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
	program.port
)
