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
		.option('-i, --input <path>','input dir for csv data [./data/raw]',String,'./data/raw')
		.option('-o, --output <path>','output dir for json data [./data/csv]',String,'./data/csv')
		.option('-m, --mappings <mappings.json>','text to csv parsing mappings  [./mappings.json]',String,'./mappings.json')
		.parse(process.argv)
,	ensureDir
=	require('ensureDir')
,	mappings
=	fsExists(program.mappings)
		?require(program.mappings)
		:false
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!mappings)
	throw 'error: '+program.mappings+' no exists'
console.log('mappings: '+program.mappings)
ensureDir(
	program.output
,	function()
	{
		console.log('output: '+program.output)
	var	sources
	=	{}
		_.each(
			mappings
		,	function(mapping,index)
			{
			var	is_first
			=	true
				sources[index]
				=	{
						csv:
							csv()
							.from.path(
								program.input+'/'+index+'.csv'
							,	{
									header:false
								//,	columns:mapping.fields
								,	columns:_.invert(mapping.fields)
								}
							)
							.transform(
								function(record)
								{
									if(!is_first)
										return	record
									is_first=false
								return	null
								}
							)
							.to(
								program.output+'/'+index+'.csv'
							,	{
									header:true
								,	columns:_.invert(mapping.fields)
								}
							)
					}
			}
		)
	}
)
