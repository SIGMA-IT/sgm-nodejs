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
					||	belonging_to(src_assoc.source,src_assoc.target)																				||	src_assoc.target_key
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
				this.store
				=	store
				this.spec
				=	spec
				function check_spec(spec)
				{
				var	visited
				=	[]
				var	_check
				=	function(t_spec)
					{
						visited.push(t_spec.name)
					var	all_ok
					=	_(t_spec.associations)
						.every(
							function(assoc,assoc_key)
							{
								if(	(!assoc.embeded)
								||	(assoc.embeded.type=='partial')
								)	return	true
								if(!_(visited).contains(assoc.target.name))
								return	_check(assoc.target)
								else
								{
									console.log(
										'referecia circular'
									,	{
											assoc:assoc_key
										,	source:assoc.source.name
										,	target:assoc.target.name
										}
									)
									return	false
								}
							}
						)
						visited.pop()
					return	all_ok
					}
				return	_(spec)
					.every(_check)
				}
				if(!check_spec(spec)) throw 'FATAL: errores en la spec'
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
