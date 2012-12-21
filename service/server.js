//require('amd-loader')
var	connect
=	require('connect')
,	_
=	require('underscore')
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
,	hal
=	require('hal')
,	make_transformers
=	require('../lib/spec-transform.js').make_transformers
,	make_assocs
=	require('../lib/assoc-transforms.js').make_assoc_transformer
,	hal_builder
=	require('../lib/hal_builder.js').make_hal_builder(_,hal)
,	uritemplate
=	require('../lib/uritemplates.js').parse
,	collection_builder
=	require('../lib/hal_collection_builder.js').make_collection(_,hal_builder,uritemplate)
,	transformers_factory
=	make_transformers(_,hal,hal_builder,collection_builder,uritemplate,make_assocs(_,collection_builder))
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
	eval(fs.readFileSync('../lib/parseuri.js')+'')
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!transforms)
	throw 'error: '+program.transforms+' no exists'
console.log('transforms: '+program.transforms)
var	sources
=	{}
,	store
=	{}
,	store_filter
=	function(what,filter,callback)
	{
		var filtered
		=	filter.through
				?_(
					_(sources[what])
					.filter(
						function(item)
						{
						return	item[filter.key]==filter.through.id
						}
					)
				).map(
					function(item_th)
					{
						_(sources[filter.through.name])
						.find(
							function(item_tg)
							{
							return	item_th[filter.through.key]==item_tg.id
							}
						)
					}
				)
				:(filter.key&&filter.id)
					?_(sources[what])
					.filter(
						function(item)
						{
						return	item[filter.key]==filter.id
						}
					)
					:sources[what]
		return _.isFunction(callback)
			?callback(filtered)
			:filtered
	}
,	store_find
=	function(what,filter,callback)
	{
		var found
		= 
			_(sources[what])
			.find(
				function(item)
				{
				return	item[filter.key]==filter.id
				}
			)

		return _.isFunction(callback)
			?callback(found)
			:found
	}
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
				}
			)
			_(transforms)
			.each(
				function(transform_spec,transform_entry)
				{
				//console.log(transform_entry,transform_spec)
					_(transform_spec.associations)
					.each(
						function(association)
						{
							if(	association.embeded
							&&	(
									association.embeded.type=="collection"
								)
							)	association.embeded.type="list"
							//ATENTI!!! PARCHE ROÑOSOOOO
							if(	association.type=="has-many"
							)	association.template="{protocol}://{host}:{port}{+base}{/path,id}/"+association.target
						}
					)
				}
			)
			_(transforms)
			.each(
				function(transform,name)
				{
					sources[name]
					=	JSON.parse(
							fs.readFileSync(program.input+'/'+transform.storage.name+'.json','utf8')
						)
				}
			)
		var	transformers
		=	transformers_factory({find:store_find,filter:store_filter,filter_through:store_filter_through},transforms)
connect()
.use(connect.logger('dev'))
.use(connect.favicon(__dirname+'/../public/favicon.ico'))
.use(
	function(req,res)
	{
	var	parsed
	=	parseUri(req.url)
		transformers.route(
			parsed
		,	false
		,	function(result)
			{
				if(_.isObject(result))
					res.end(
						JSON.stringify(
							result
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
