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
		.option('-i, --input <path>','input dir for csv data [./data/csv]',String,'./data/csv')
		.option('-o, --output <path>','output dir for json data [./data/json]',String,'./data/json')
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
	,	buffer
	=	[]
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
								buffer[index]
							)
						)
						out.end()
					}
				)
			}
		)
	}
)
