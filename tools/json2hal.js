//require('amd-loader')
var	csv
=	require('csv')
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
		.option('-o, --output <path>','output dir for hal data [./data/hal]',String,'./data/hal')
		.option('-t, --transforms <transforms.json>','linking and embeding transforms [./transforms.json]',String,'./transforms.json')
		.parse(process.argv)
,	ensureDir
=	require('ensureDir')
,	hal
=	require('hal')
,	make_transformers
=	require('../lib/spec-transform.js').make_transformers
,	hal_builder
=	require('../lib/hal_builder.js').make_hal_builder(_,hal)
,	uritemplate
=	require('../lib/uritemplates.js').parse
,	collection_builder
=	require('../lib/hal_collection_builder.js').make_collection(_,hal_builder,uritemplate)
,	transformers_factory
=	make_transformers(_,hal,hal_builder,collection_builder,uritemplate)
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
ensureDir(
	program.output
,	function()
	{
		console.log('output: '+program.output)
	var	sources
	=	{}
	,	store
	=	{}
	,	store_filter
	=	function(what,by_key,by_id)
		{
		return	_(sources[what])
			.filter(
				function(item)
				{
				return	item[by_key]==by_id
				}
			)
		}
	,	store_find
	=	function(what,by_key,id_to_find)
		{
		return	_(sources[what])
			.find(
				function(item)
				{
				return	item[by_key]==id_to_find
				}
			)
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
								uri:'/'+transform_spec.storage.name
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
	=	transformers_factory({find:store_find,filter:store_filter},transforms)

		_(sources)
		.each(
			function(source,name)
			{
			var	out
			=	fs.createWriteStream(program.output+'/'+name+'.json')
				out.write(
					JSON.stringify(
						_(source)
						.map(transformers[name])
					)
				)
			}
		)
	}
)
