var	Factory
=	function(
		_
	)
	{
	var	belonging_to
	=	function(src_spec,tgt_spec)
		{
		//TODO: manejar casos de multiples belongs-to same target
		//desambiguar via roles o bien requerir especificar target_key
		var	found
		=	_(tgt_spec.associations)
			.find(
				function(assoc)
				{
				return	assoc.type=="belongs-to"
					&&	assoc.target.name==src_spec.name
				}
			)
			if(!found)
			{
				console.log([src_assoc,tgt_spec])
				throw  ('Fatal: '+src_spec.name)
			}
		return	found.key
		}
	,	belonging_to_through
	=	function(assoc)
		{
		return	{
				through:belonging_to(assoc.source,assoc.through)
			,	target:belonging_to(assoc.target,assoc.through)
			}
		}
	,	get_filter
	=	function(src_assoc,src_data)
		{
		var	tgt
		=	src_assoc.target.name
		,	src_key
		=	src_assoc.key||'id'
		return	src_assoc.through
				?(
					function()
					{
					var	keys
					=	belonging_to_through(src_assoc)
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
					||	belonging_to(src_assoc.source,src_assoc.target)
					||	src_assoc.target_key
					return	{
						//	key:src_assoc.through.name // o 'id'???
							key:tgt_key
						,	id:src_data[src_key]
						}
					}
				)()
		}
	return	function(store,spec)
			{
				this.valid_sintax
				=	{
						'has-many':{
							required: ['target', 'target_key']
						,	key:'target_key'
						,	target_rel:'target'
						,	optional: ['linked']
						}
					,	'has-one':{
							required: ['target', 'key']
						,	target_rel:'target'
						,	key:'key'
						}
					,	'belongs-to':{
							required: ['target', 'key']
						,	target_rel:'parent.target'
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
					}			

				this.store
				=	store
				this.spec
				=	spec
				this.check_assoc_sintax
				=	function(assoc,assoc_key,spec_key)
				{
					var 	attr_sintax
					=	this.valid_sintax[assoc.type]
					
					if(!attr_sintax)
						throw 'error: wrong assoc-type <<'+assoc.type+'>> in ' +spec_key+':' +assoc_key
					
					return  _.every(
							attr_sintax.required
						,	function(attr,index){
								if(!_.has(assoc,attr))
									throw 'error: missing field <<'+attr+'>> in ' +spec_key+':'+assoc_key+':'+assoc.type
								return _.has(assoc,attr)
							}
						)
				}
				//checkeo si existe en el mapping
				this.check_assoc_rel
				=	function(assoc,assoc_entry,spec_key,mappings)
				{
					var 	attr_sintax
					=	this.valid_sintax[assoc.type]
					,	mapping
					=	mappings[attr_sintax.target_rel]

					//si "target_rel" == parent.target ??? tomarlo de spec_key

					if(!_.has(mapping.fields,assoc[attr_sintax.key]))
						throw 'error: missing field  <<'+assoc[attr_sintax.key]+'>> in mapping ' +spec_key
					return _.has(mapping.fields,assoc[attr_sintax.key])
				}
				this.check_assoc
				=	function(assoc,assoc_key,visited)
				{
					console.log(visited)
					if(	(!assoc.embeded)
					||	(assoc.embeded.type=='partial')
					)	return	true
					if(!_(visited).contains(assoc.target.name))
					return	_check(assoc.target)
					else
					{
						console.log(
							'referencia circular'
						,	{
								assoc:assoc_key
							,	source:assoc.source.name
							,	target:assoc.target.name
							}
						)
						return	false
					}
				}
				this.check_spec
				=	function(spec)
				{
				var	visited
				=	[]
				var	_check
				=	function(t_spec)
					{
						visited.push(t_spec.name)
					var	all_ok
					=	_(t_spec.associations).every(
							function(a,k){return this.check_assoc(a,k,visited)}
						)	
						visited.pop()
					return	all_ok
					}
				return	_(spec)
					.every(_check)
				}
				if(!this.check_spec(spec)) throw 'FATAL: errores en la spec'
					//----------------------
				this.get_filter
				=	function(collection,association,data)
					{
					return	get_filter(
							this
							.spec[collection]
							.associations[association]
						,	data
						)
					}
				this.get_filter_related
				=	function(collection,subcollection,data)
					{
					var	assoc
					=	_(	this
							.spec[collection]
							.associations
						).find(
							function(assoc)
							{
							return	assoc.name==subcollection
							||	assoc.target.name==subcollection
							}
						)
						if(!assoc)
							throw	'errororoor'
					return	this.get_filter(
							collection
						,	assoc.name
						,	data
						)
					}
				this.get_url
				=	function(association,data)
					{
					return	(association.type=='has-many')
							?association.get_link(data)
							:_(data[association.key]).isNull()
								?false
								:association.target.api.get_url(
									{
										id:data[association.key]
									}
								)
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
