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
		_.each(
			transforms
		,	function(source_transform,index)
			{
				sources[index]
				.transform
				=	function(what)
					{
					var	transformed
					=	_(what).clone()
					,	transformers
					=	_(source_transform)
						.reduce(
							function(result,field_t,key)
							{
							var	make_transformer
							=	function(field)
								{
								var	is_single
								=	field.key!=undefined
								,	is_linked
								=	field.linked!=undefined
								,	src
								=	index
								,	src_key
								=	is_single
										?field.key
										:'id'
								,	tgt
								=	is_linked
										?field.linked
										:field.embeded
								,	tgt_key
								=	is_linked
										?field.linked_key
										:field.embeded_key
								return	function(source_item,transform_key)
									{
									var	embed_single
									=	function()
										{
										return	_(buffer[tgt])
											.find(
												function(target_item)
												{
												return	source_item[src_key]==target_item[tgt_key]
												}
											)
										}
									,	embed_list
									=	function()
										{
										return	_(buffer[tgt])
											.filter(
												function(target_item)
												{
												return	source_item[src_key]==target_item[tgt_key]
												}
											)
										}
										source_item[transform_key]
										=	is_single
											?is_linked
												?{link_me_please:'filter: '+tgt+'/'+tgt_key+' = '+src+'/'+src_key+'('+source_item[src_key]+')'}
												:embed_single()
											:embed_list()
									}
								}
								result[key]=make_transformer(field_t)
							return	result
							}
						,	{}
						)
						_(transformers)
						.each(
							function(t,k)
							{
								t(transformed,k)
							}
						)
					return	transformed
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
								_(buffer[index])
								.map(source.transform)
							)
						)
						out.end()
					}
				)
			}
		)
	}
)
