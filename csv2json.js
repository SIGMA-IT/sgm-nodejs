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
		.option('-c, --config <config.json>','config [./config.json]',String,'./config.json')
		.parse(process.argv)
,	ensureDir
=	require('ensureDir')
,	config
=	fsExists(program.config)
		?require(program.config)
		:false
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!config)
	throw 'error: '+program.config+' no exists'
console.log('config: '+program.config)
ensureDir(
	program.output
,	function()
	{
		console.log('output: '+program.output)
	var	sources={}
		_.each(
			config
		,	function(mapping,index)
			{
			var	buffer
			=	[]
			,	fields_columns
			=	_(mapping.fields)
				.reduce(
					function(result,field,key)
					{
					var	f
						=	_.isString(field)
								?field
								:field.key
									?field.key
									:false
						if(f)
							result[key]=f
					return	result
					}
				,	{}
				)
			,	is_first=true
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
									if(!is_first)
										buffer.push( record )
									else
										is_first=false
								return	null
								}
							)
					,	buffer:buffer
					,	mapping:mapping
					}
				}
		)
		_.each(
			sources
		,	function(source,index)
			{
			var	out
			=	fs.createWriteStream(program.output+'/'+index+'.json')
			,	transformers
			=	_(source.mapping.fields)
				.reduce(
					function(result,field,key)
					{
					var	transform
					=	function(field)
						{
						var	is_single
						=	field.key!=undefined
						,	is_linked
						=	field.linked!=undefined
						,	src
						=	index
						,	src_key
						=	source.mapping.fields.id
						,	tgt
						=	is_linked
								?field.linked
								:field.embeded
						,	tgt_key
						=	is_linked
								?field.linked_key
								:field.embeded_key
						return	function(source_item,id)
							{
							return	is_single
								?is_linked
									?{link_me_please:tgt+'/'+tgt_key+'('+id+')'}
									:{embed_me_please:tgt+'/'+tgt_key+'('+id+')'}
								:[]
							}
						}
					,	f
						=	_.isString(field)
								?false //skip single fields
								:transform(field)
							if(f) result[key]=f
					return	result
					}
				,	{}
				)
				console.log('Processing: '+index)
				source.csv
				.on(
					'end'
				,	function()
					{
						out.write(
							JSON.stringify(
								_(source.buffer)
								.map(
									function(item)
									{
										_(transformers)
										.each(
											function(t,k)
											{
												item[k+'_eval']=t(item,item[k])
											}
										)
									return	item
									}
								)
							)
						)
						out.end()
					}
				)
			}
		)
	}
)
