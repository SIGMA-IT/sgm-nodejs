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
,	AssociationsTransformers
=	require('../lib/assoc-transforms.js')(_)
,	SpecTransforms
=	require('../lib/spec-transform.js')(
			_
		,	hal
		,	hal_builder
		,	collection_builder
		,	uritemplate
		,	parseUri
		,	AssociationsTransformers
		,	Q
		)
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
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
			_(transforms)
			.each(
				function(transform_spec,transform_entry)
				{
				//console.log(transform_entry,transform_spec)
					_(transform_spec)
					.defaults(
						{
							storage:
								{
									name:transform_entry
								}
						}
					)
					_(transform_spec)
					.defaults(
						{
							api:
								{
									"uri":'/'+transform_spec.storage.name
								}
						}
					)
					_(transform_spec.api)
					.defaults(
						{
							"url":
								{
									"base":"/api/data"
								,	"host":"trabajando"
								,	"port":"3003"
								,	"protocol":"http"
								,	"path":transform_entry
								}
						,	"templates":
								{
									"find_one":"{protocol}://{host}:{port}{+base}{/path,id}"
								,	"query":transform_entry+"{?query*}"
								}
						}
					)
					_(transform_spec.associations)
					.each(
						function(association,assoc_key)
						{
							if(	association.embeded
							&&	(
									association.embeded.type=="collection"
								)
							)	association.embeded.type="list"
						}
					)
				}
			)
			/*
			_(transforms)
			.each(
				function(transform,name)
				{
					store.add(
						name
					,	JSON.parse(
							fs.readFileSync(program.input+'/'+transform.storage.name+'.json','utf8')
						)
					)
				}
			)
			*/
		var	spec_transforms
		=	new SpecTransforms(store,transforms)
		var	router
		=	spec_transforms.get_router()
connect()
.use(connect.logger('dev'))
.use(connect.favicon(__dirname+'/../public/favicon.ico'))
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
		,	false
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
					//res.write("404 Not found");
					res.end();
				}
			}
		)
	}
).listen(program.port)
