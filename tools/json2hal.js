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
,	make_transformers
=	require('../lib/spec-transform.js').make_transformers
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
		_.each(
			transforms
		,	function(transform,index)
			{
			var	input
			=	JSON.parse(
					fs.readFileSync(program.input+'/'+index+'.json','utf8')
				)
			sources[index]
				=	JSON.parse(
						fs.readFileSync(program.input+'/'+index+'.json','utf8')
					)
		}
		)
	var	transformers
	=	make_transformers(_)({find:store_find,filter:store_filter},transforms)
		_(sources)
		.each(
			function(source,index)
			{
			var	out
			=	fs.createWriteStream(program.output+'/'+index+'.json')
				console.log('Processing: '+index)
				out.write(
					JSON.stringify(
						_(source)
						.map(transformers[index])
					)
				)
			}
		)
	}
)
