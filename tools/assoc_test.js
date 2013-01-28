//require('amd-loader')
var	config
=	require('../service/config.js')()
,	base_lib
=	config.paths.lib
,	fs
=	require('fs')
,	fsExists
=	fs.existsSync || path.existsSync
,	program
=	require('commander')
		.version('0.0.1')
		.version('0.0.1')
		.option(
				'-i, --input <path>'
			,	'input dir to find json data [./data/json]'
			,	String
			,	config.paths['sru.api.service']+'data/json'
		)
		.option(	'-m, --mappings <mappings.json>'
			,	'mappings fields in csv data [./mappings.json]'
			,	String
			,	config.paths['sru.api.service']+'specs/mappings.json'
		)
		.option(
				'-t, --transforms <transforms.json>'
			,	'linking and embeding transforms [./specs/transforms.json]'
			,	String
			,	config.paths['sru.api.service']+'specs/transforms.json'
		)
		.parse(process.argv)
,	ensureDir
=	require('ensureDir')
,	mappings
=	fsExists(program.mappings)
		?require(program.mappings)
		:false
var	_ //underscore+string
=	require('underscore')
//	_.mixin(require('underscore.string').exports())
var	Overscore
=	require(base_lib+'overscore.js')(_)
	//require('../lib/underscore-data.js')
//parseUri------------------------------------------
	eval(fs.readFileSync(base_lib+'parseuri.js')+'')
//---------------------------------------------------

var	uritemplate
=	require(base_lib+'uritemplates.js').parse
,	transforms
=	fsExists(program.transforms)
		?require(program.transforms)
		:false
,	AssociationsTransformers
=	require(base_lib+'assoc-transforms.js')(
		_
	,	mappings
	,	transforms	
	)
if(!fsExists(program.input))
	throw 'error: '+program.input+' no exists'
console.log('input: '+program.input)
if(!mappings)
	throw 'error: '+program.mappings+' no exists'
console.log('mappings: '+program.mappings)
if(!transforms)
	throw 'error: '+program.transforms+' no exists'
console.log('transforms: '+program.transforms)
var	Store
=	require(base_lib+'store.js')(_)
,	store
=	new	Store(
		_(transforms)
		.objMap(
			function(transform,name)
			{
			return	program.input
			+	'/'
			+	transform.storage.name
			+	'.json'
			}
		)
	,	function(what)
		{
		return	JSON
			.parse(
				fs.readFileSync(what,'utf8')
			)
		}
	)

_(transforms)
	.each(
		function(spec){
			var	assoc_transforms
			=	new AssociationsTransformers(store,spec)			
			,	visited
			=	[]
			
			_.objMap(
				spec
			,	function(t_spec,t_entry){
					//(k)->(v) : transform_entry -> transform_spec
					if(spec.associations && t_entry=='associations'){
						assocs 
						= 	new Array
						_(t_spec).each(
							function(assoc,assoc_entry){
								
								assocs.push({
									assoc: assoc_entry
								,	valid_sintax: assoc_transforms.check_assoc_sintax(assoc,assoc_entry,spec.storage.name)
								,	valid: assoc_transforms.check_assoc_rel(assoc,assoc_entry,spec.storage.name)
								})
							}
						)
						console.log(
							{
								spec: spec.storage.name
							,	assocs: assocs
							,	valid: assoc_transforms.check_all_spec(spec)	
							}
						)
					}
				}
			)
			visited.pop()
		}
	)