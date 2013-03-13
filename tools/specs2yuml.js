//require('amd-loader')
var	_
=	require('underscore')
,	Overscore
=	require('../lib/overscore.js')(_)
,	path
=	require('path')
,	fs
=	require('fs')
,	fsExists
=	fs.existsSync || path.existsSync
,	program
=	require('commander')
		.version('0.0.1')
		.option('-t, --transforms <path>','transforms.json dir [./transforms.json]',String,'./transforms.json')
		.option('-m, --mappings <mappings.json>','mappings.json dir  [./mappings.json]',String,'./mappings.json')
		.option('-o, --output <path>','output dir for yuml [./yuml.json]',String,'./yuml.json')
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
,	output
=	fs.createWriteStream(program.output,{'flags': 'w'})
,	Colour
=	require('coloured')
,	Log
=	require('log')
,	ServerLog
=	require('../lib/logger.js')(
		_
	,	Log
	,	Colour
	)
,	logger
=	new ServerLog()
if(!fsExists(program.transforms))
	logger.error('Program Transforms: no such file'+program.transforms)
if(!fsExists(program.mappings))
	logger.error('Program Mappings: no such file'+program.mappings)
logger.info('Program Transforms: '+program.input)
logger.info('Program Mappings: '+program.mappings)
ensureDir(
	program.output
,	function()
	{
		logger.info('Program Output: '+program.output+'.json')
		logger.warning('The YUML diagram may be wrong in case of incompleted relationships')
		// OUTPUT EXAMPLE
		// {
		// 	type: "class",
		// 	digest: "c9ce39b0",
		// 	mime: "image/png",
		// 	file_only: false,
		// 	dsl: "// Cool Class Diagram, [Customer]<>-orders*>[Order], [Order]++-0..*>[LineItem], [Order]-[note:Aggregate root.]",
		// 	customisations: "scruffy;",
		// 	extension: "png"
		// }
		var	output_object
		=	{
				type: "class"
			,	mime: "image/png"
			,	file_only: false
			,	customisations: "scruffy;"
			,	extension: "png"
			,	digest: "c9ce39b0"
			}
		,	dsl
		=	'// Specs2yuml Class Diagram, '
		,	getUnion
		=	function(transform_key,assoc)
			{
				var	inversed_type
				=	(assoc.type == "belongs-to")
					?	["has-one","has-many"]
					:	["belongs-to"]
				,	target_assoc
				=	_.find(
						transforms[assoc.target].associations
					,	function(t_assoc,t_assoc_key)
						{
							return	t_assoc.target == transform_key
								&&	_.contains(inversed_type,t_assoc.type)
						}
					)
				var	union
				=	''
				if (_.isUndefined(target_assoc))
					{
						union	=	'<->'
					}
				else
					{
						union	=	(assoc.type == "belongs-to")
									?	'1'
									:	(assoc.type == "has-one")
										?	'1'
										:	'1..*'
						union	+=	'<->'
						union	+=	(target_assoc.type == "belongs-to")
									?	'1'
									:	(target_assoc.type == "has-one")
										?	'1'
										:	'1..*'
					}
				return union
			}
		_.each(
			transforms
		,	function(transform,transform_key)
			{
				_.each(
					transform.associations
				,	function(assoc,assoc_key)
					{
						if (_.contains(["belongs-to","has-one","has-many"],assoc.type))
							dsl	+=	', ['+transform_key+']'
								+	getUnion(transform_key,assoc)
								+	'['+assoc.target+']'
					}
				)
			}
		)
		_.extend(
			output_object
		,	{
				dsl: dsl
			}
		)
		fs.writeFile(
			program.output
		,	JSON.stringify(output_object)
		)
	}	
)
