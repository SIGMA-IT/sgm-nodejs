var	Factory
=	function(
		_
	,	mappings
	,	transforms
	)
	{
	return	function(store,spec)
		{
			return {
			//	Helpers control	
			valid_sintax: 	
				{
					'has-many':{
						required: ['target', 'target_key']
					,	key:'target_key'
					,	optional: ['linked']
					}
				,	'has-one':{
						required: ['target', 'key']
					,	key:'key'
					}
				,	'belongs-to':{
						required: ['target', 'key']
					,	key:'key'
					}
				,	'linked':{
						required: ['target', 'target_key','target_attr']
					,	key:'target_key'
					}
				,	'has-many:through':{
						required: ['target', 'target_key']
					,	key:'target_key'
					}
				,	'has-one:through':{
						required: ['target', 'key']
					,	key:'key'
					}
				}
		,	check_assoc_sintax: 	function(assoc,assoc_key)
				{
					var	attr_sintax
					=	this.valid_sintax[assoc.type]
					
					if(!attr_sintax)
						throw 'error: wrong assoc-type <<'+assoc.type+'>> in ' +assoc_key+' : '+assoc.type
					
					return  _.every(
							attr_sintax.required
						,	function(attr,index)
							{
								if (!_.has(assoc,attr))
									//throw 'error: missing field <<'+attr+'>> in ' +assoc.source.name+':'+assoc_key+':'+assoc.type
									throw 'error assoc_sintax: missing field <<'+attr+'>> in ' +assoc_key+' : '+assoc.type
								return _.has(assoc,attr)
							}
						)
				}
		,	check_assoc_rel: 	function(assoc,assoc_entry,spec_key)
		//	checkeo si existe en el mapping la relacion que busca 
		//	table.foreign_key==foreign_table.id (donde, id es generico. Puede ser cualquier campo)
				{
					//	TODO: tomar assoc.source.name en lugar de "spec_key"
					var	attr_sintax
					=	this.valid_sintax[assoc.type]
					,	transforms_key
					=	(assoc.type=="has-one" || assoc.type=="belongs-to")?
					 		spec_key : assoc.target
					,	mapping_key
					=	(assoc.type=="belongs-to")? //::target_rel
						//Caso de tabla solo con belongs_to (tabla consolidadora, ej:referentes=>persona_universidad_facultad_cargo)
							transforms_key
							:transforms[transforms_key].storage.name
					,	mapping
					=	mappings[mapping_key]

					//	si "target_rel" == parent.target ??? tomarlo de spec_key

					if(!_.has(mapping.fields,assoc[attr_sintax.key]))
						throw 'error assoc_rel: missing field <<'+assoc[attr_sintax.key]+'>> in mapping: '+spec_key+':'+assoc_entry
					
					return	_.has(
								mapping.fields
							,	assoc[attr_sintax.key]
							)
				}
		, 	check_assoc: 	function(assoc,assoc_key,visited)
				{
					if ((!assoc.embeded) || (assoc.embeded.type=='partial'))
						return	check_assoc_sintax(
									assoc
								,	assoc_key
								)
					if (!_(visited).contains(assoc.target.name))
						return	_check(assoc.target)
					else
					{
						console.log(
							'referencia circular'
						,	{
								assoc:assoc_key
							,	source:assoc.source
							,	target:assoc.target
							}
						)
						return	false
					}
				}
		,	check_spec: 	function(t_spec)
				{
					var 	visited
					=	[]
					visited.push(t_spec.name)
					var	all_ok
					=	_(t_spec.associations)
							.every(
								function(a,k)
								{
									return check_assoc(a,k,visited) && check_assoc_rel(a,k,t_spec.storage.name)
								}
							)	
					visited.pop()
					return	all_ok
				}
		,	check_all_spec: 	function(spec)
				{	
					return	_(spec)
								.every(this.check_spec)
				}
		,	belonging_to:	function(src_spec,tgt_spec)
				{
					//TODO: manejar casos de multiples belongs-to same target
					//desambiguar via roles o bien requerir especificar target_key
					//throw 	"STOP belonging_to"
					var	found
					=	_(tgt_spec.associations)
						.find(
							function(assoc)
							{
							return	assoc.type=="belongs-to"
								&&	assoc.target==src_spec.storage.name
							}
						)
						if(!found)
						{
							console.log([src_spec,tgt_spec])
							throw  ('Error rel, maybe missing throw relationship. See "has-many:throw" in '+src_spec)
						}
						console.log("found",found)
					return	found.key
				}
		,	belonging_to_through:	function(assoc)
				{
					return	{
							through:this.belonging_to(assoc.source,assoc.through)
						,	target:this.belonging_to(assoc.target,assoc.through)
						}
				}
		,	has_one:	function(src_spec,tgt_spec)
				{
					var	found
					=	_(tgt_spec.associations)
						.find(
							function(assoc)
							{
							return	assoc.type=="belongs-to"
								&&	assoc.target==src_spec.storage.name
							}
						)
						if(!found)
						{
							console.log([src_spec,tgt_spec])
							throw  ('Error rel, maybe missing throw relationship. See "has-many:throw" in '+src_spec)
						}

					return	found.key
				}
		,	has_many:	function(src_spec,tgt_spec)
				{
					var	filtered
					=	_(tgt_spec.associations)
						.filter(
							function(assoc)
							{
							return	assoc.type=="belongs-to"
								&&	assoc.target==src_spec.storage.name
							}
						)
						if(!filtered)
						{
							console.log([src_spec,tgt_spec])
							throw  ('Error rel'+src_spec)
						}
						
					return	filtered
				}
		,	has_many_through:	function(assoc)
				{
					return	{
							through:this.has_many(assoc.source,assoc.through)
						,	target:this.has_many(assoc.target,assoc.through)
						}
				}
		,	get_filter: 	function(collection,association,data)
				{

				var 	src_assoc
				=	spec[collection].associations[association]
				,	src_data
				=	data

				//Chequeo la relacion dinamica
				if(!this.check_assoc_rel(src_assoc,src_data.collection))
				 	throw "Error invalid assoc_rel: "+src_data.collection

				var	tgt
				=	src_assoc.target.name
				,	src_key
				=	src_assoc.key||'id'
				,	self
				=	this
				return	src_assoc.through
						?(
							function()
							{
							var	keys
							=	self.belonging_to_through(src_assoc)
							return	{
								//	key:src_assoc.through.name // o 'id'???
									key:'id'
								,	through:
									{
										id:src_data['id']
									,	key:keys.through
									,	name:src_assoc.through.name
									,	target_key:keys.target
									}
								}
							}
						)()
						:(
							function()
							{
							var	tgt_key
							=	src_assoc.target_key
							||	belonging_to(transforms[src_assoc.source],transforms[src_assoc.target])
							||	src_assoc.target_key
							return	{
								//	key:src_assoc.through.name // o 'id'???
									key:tgt_key
								,	id:src_data[src_key]
								}
							}
						)()
				}
		,	get_filter_related: 	function(collection,subcollection,data)
				{
					var	assoc
					=	_(	spec[collection]
									.associations
						).find(
							function(assoc)
							{
								return	assoc.name == subcollection
										|| assoc.target == subcollection
							}
						)

					if(!assoc)
						throw 'error: missing assoc using collection: <<'+collection+'>> subcollection: '+subcollection

					//throw "STOP GET FILTER RELATED"
					return	this.get_filter(
								collection
							,	assoc.name
							,	data
							)
				}
		,	get_url: 	function(association,data)
				{
					return	(association.type=='has-many')
							?	association.get_link(data)
							:	_(data[association.key]).isNull()
								?	false
								: 	association.target
										.api.get_resource_url(
											{
												id:data[association.key]
											}
										)
				}
			}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.AssocTransformsFactory
	=	Factory
else
	module.exports
	=	Factory
