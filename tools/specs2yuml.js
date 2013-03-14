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
,	querystring
=	require('querystring')
,	http
=	require('http')
,	program
=	require('commander')
		.version('0.0.1')
		.option('-t, --transforms <path>','transforms.json dir [./transforms.json]',String,'./transforms.json')
		.option('-m, --mappings <mappings.json>','mappings.json dir  [./mappings.json]',String,'./mappings.json')
		.parse(process.argv)
,	mappings
=	fsExists(program.mappings)
		?require(program.mappings)
		:false
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
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

logger.info('Program Transforms: '+program.transforms)
logger.info('Program Mappings: '+program.mappings)

logger.warning('The YUML diagram may be wrong in case of incompleted relationships')

var	yuml_url
=	'http://yuml.me/diagram/scruffy;/class/'
,	dsl_text
=	'//SPECS2YUML DIAGRAM'
,	relations
=	_.keys(transforms)
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
				union	=	'<->'
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

while(relations.length > 0)
{
	var	transform_key
	=	relations.pop()
	,	assocs_target
	=	new Array()
		_.each(
			transforms[transform_key].associations
		,	function(assoc)
			{
				if (_.contains(["belongs-to","has-one","has-many"],assoc.type) && _.contains(relations,assoc.target))
					{
						
						dsl_text	+= ', ['+transform_key+']'
									+	getUnion(transform_key,assoc)
									+	'['+assoc.target+']'
					}
			}
		)
}
logger.info('Processing transforms, please wait')

var	post_data
=	querystring.stringify(
		{
			dsl_text : dsl_text
		}
	)
,	post_options
=	{
		host: 'yuml.me'
	,	path: '/diagram/scruffy;/class/'
	,	method: 'POST'
	,	headers:
		{
			'Content-Type': 'application/x-www-form-urlencoded'
		,	'Content-Length': post_data.length
		}
	}
,	post_req
=	http.request(
		post_options
	,	function(res)
		{	
			res.setEncoding('utf8')
			res.on(
					'data'
				,	function (result_png)
					{
						logger.notice('<<URL to YUML Diagram>>: '+yuml_url+result_png)
					}
				)
		}
	)
post_req.write(post_data);
post_req.end();