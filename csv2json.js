require('amd-loader')
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
		.option('-i, --input <path>','input dir for csv data [./data]',String,'./data')
		.option('-o, --output <path>','output dir for json data [./out]',String,'./out')
		.option('-m, --mappings <mappings.json>','text to csv parsing mappings  [./mappings.json]',String,'./mappings.json')
		.option('-t, --transforms <transforms.json>','linking and embeding transforms [./transforms.json]',String,'./transforms.json')
		.parse(process.argv)
,	ensureDir
=	require('ensureDir')
,	make_transformers
=	require('./spec-transform.js')
,	mappings
=	fsExists(program.mappings)
		?require(program.mappings)
		:false
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!mappings)
	throw 'error: '+program.mappings+' no exists'
console.log('mappings: '+program.mappings)
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
	,	buffer
	=	[]
	,	store
	=	{}
	,	store_filter
	=	function(what,by_key,by_id)
		{
		return	_(buffer[what])
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
		return	_(buffer[what])
			.find(
				function(item)
				{
				return	item[by_key]==id_to_find
				}
			)
		}
		_.each(
			mappings
		,	function(mapping,index)
			{
				sources[index]
				=	{
						csv:
							csv()
							.from.path(
								program.input+'/'+index+'.csv'
							,	{
									header:true
								,	columns:mapping.fields
								}
							)
							.transform(
								function(record)
								{
									if(!buffer[index])
										buffer[index]=[]
									else
										buffer[index].push( record )
								return	null
								}
							)
					}
			}
		)
	var	transformers
	=	make_transformers(_,{find:store_find,filter:store_filter},transforms)
		_(sources)
		.each(
			function(source,index)
			{
			var	out
			=	fs.createWriteStream(program.output+'/'+index+'.json')
				console.log('Processing: '+index)
				source.csv
				.on(
					'end'
				,	function()
					{
						out.write(
							JSON.stringify(
								_(buffer[index])
								.map(transformers[index])
							)
						)
						out.end()
					}
				)
			}
		)
	}
)
