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
						required: ['type','target','target_key','target_attr']
					,	key:'target_key'
						//type: none, single, nested
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
		,	check_assoc_sintax_optional: 	function(assoc,assoc_key)
				{
					var	attr_sintax
					=	this.valid_sintax[assoc.type]
					,	valid_sintax
					=	this.valid_sintax

					return  (!_.isUndefined(attr_sintax.optional))
						&& _.every(	//each optional
							attr_sintax.assoc_sintax_optional
						,	function(option,index)
							{
								return  (!_.isUndefined(assoc[option]))
									&& (assoc[option].type!="none")
										?_.every(	//each required from option
											valid_sintax[option].required
										,	function(attr,index)
											{
												if (!_.has(assoc[option],attr))
												{
													console.log('error assoc_sintax_optional: missing field <<'+attr+'>> in '+option +' : '+assoc_key)
													throw 'error assoc_sintax_optional: missing field <<'+attr+'>> in '+option +' : '+assoc_key
												}
												return _.has(assoc[option],attr)
											}
										)
										:true
							}
						)
					
				}
		,	check_assoc_sintax_required: 	function(assoc,assoc_key)
				{
					
					if(_.isUndefined(this.valid_sintax[assoc.type]))
					{
						console.log('error: wrong assoc-type <<'+assoc.type+'>> in ' +assoc_key+' : '+assoc.type + assoc)
						throw 'error: wrong assoc-type <<'+assoc.type+'>> in ' +assoc_key+' : '+assoc.type + assoc
					}

					var	attr_sintax
					=	this.valid_sintax[assoc.type]
					return	_.every(
							attr_sintax.required
						,	function(attr,index)
							{
								if (!_.has(assoc,attr))
								{
									console.log('error assoc_sintax: missing field <<'+attr+'>> in ' +assoc_key+' : '+assoc.type)
									throw 'error assoc_sintax: missing field <<'+attr+'>> in ' +assoc_key+' : '+assoc.type
								}
								return _.has(assoc,attr)
							}
						)
				}
		,	check_assoc_sintax: 	function(assoc,assoc_key)
				{
					return this.check_assoc_sintax_required(assoc,assoc_key) 
						&&	this.check_assoc_sintax_optional(assoc,assoc_key)
				}
		,	check_assoc_rel: 	function(assoc,assoc_entry,spec_key)
		//	check mapping relationship
		//	table.foreign_key==foreign_table.id (where, 'id' is generic. Could be any field)
				{
					//	TODO: take assoc.source.name instead of "spec_key"
					
					var	attr_sintax
					=	this.valid_sintax[assoc.type]
					,	transforms_key
					=	(assoc.type=="has-one" || assoc.type=="belongs-to")
							?spec_key
							:assoc.target
					,	mapping_key
					=	(assoc.type=="belongs-to")
							?transforms_key
							:transforms[transforms_key].storage.name
					,	mapping
					=	mappings[mapping_key]

					if(!_.has(mapping.fields,assoc[attr_sintax.key]))
					{
						console.log('error assoc_rel: missing field <<'+assoc[attr_sintax.key]+'>> in mapping: '+spec_key+':'+assoc_entry)
						throw 'error assoc_rel: missing field <<'+assoc[attr_sintax.key]+'>> in mapping: '+spec_key+':'+assoc_entry
					}
						
					
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
									return	check_assoc(a,k,visited) 
										&& 	check_assoc_rel(a,k,t_spec.storage.name)
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
		,	get_key: function(assoc)
			{
				return this.valid_sintax[assoc.type].key
			}
		,	belongs_to_through: function(src_assoc,src_data)
			{
				var	src_key
				=	this.get_key(src_assoc)
				,	tgt_spec
				=	transforms[src_assoc.source]
				,	src_spec
				=	transforms[src_assoc.target]
				,	keys
				=	{
						through: this.belongs_to(tgt_spec,src_data)
					,	target: this.belongs_to(src_spec,src_data)
					}
				,	found
				=	_(tgt_spec.associations)
						.find(
							function(assoc)
							{
								return	assoc.type	==	"belongs-to:through"
									&&	assoc.target==	src_spec.storage.name
							}
						)
				
				if(!found)
				{
					console.log('Error rel, maybe missing relationship.')
					throw  ('Error rel, maybe missing relationship.')
				}

				return	{
						key	:	found.key
					,	id	:	src_data[src_key]
					,	through:
						{
							id:src_data[src_key]
						,	key:keys.through
						,	name:src_assoc.through
						,	target_key:keys.target
						}
					}	
			}
		,	has_many_through:	function(assoc)
			{
				var	src_key
				=	this.get_key(src_assoc)
				,	tgt_spec
				=	transforms[src_assoc.source]
				,	src_spec
				=	transforms[src_assoc.target]
				,	keys
				=	{
						through: this.belongs_to(tgt_spec,src_data)
					,	target: this.belongs_to(src_spec,src_data)
					}
				,	filtered
				=	_(tgt_spec.associations)
						.find(
							function(assoc)
							{
								return	assoc.type	==	"has-many:through"
									&&	assoc.target==	src_spec.storage.name
							}
						)
				if(!filtered)
				{
					console.log('Error rel, maybe missing relationship.')
					throw  ('Error rel, maybe missing relationship.')
				}

				return	_.map(
						filtered
					,	function(filter)
						{
							return 	{
									key	:	filter.key
								,	id	:	src_data[src_key]
								,	through:
									{
										id:src_data[src_key]
									,	key:keys.through
									,	name:src_assoc.through
									,	target_key:keys.target
									}
								}
						}
					)
			}
		,	belongs_to:	function(found,src_assoc,src_data)
			{
				return	{
							key	:	'id'
						,	target_key: found[this.get_key(src_assoc)]
						,	source_key:	found[this.get_key(src_assoc)]
						}		
			}
		,	has_one:	function(found,src_assoc,src_data)
			{
				return	{
							key	:	found[this.get_key(src_assoc)]
						,	target_key: 'id'
						,	source_key: 'id'
						}
			}
		,	has_many:	function(found,src_assoc,src_data)
			{
				return	{
							key	:	'id'
						,	target_key: found[this.get_key(src_assoc)]
						,	source_key: 'id'
						}	
			}
		,	get_filter: 	function(collection,association,data)
				{
				var	src_assoc
				=	spec[collection].associations[association]
				,	src_data
				=	data

				//Check relationship on routing
				if(
					!this.check_assoc_sintax(src_assoc,src_data.subcollection)
					&&
					!this.check_assoc_rel(src_assoc,src_data.subcollection,src_data.collection)
				)
				{
					console.log("Error invalid assoc_rel: "+src_data.collection)
				 	throw "Error invalid assoc_rel: "+src_data.collection	
				}
				 	
				
				var	tgt_spec
				=	transforms[src_assoc.source]
				,	src_spec
				=	transforms[src_assoc.target]
				,	found
				=	_(tgt_spec.associations)
						.find(
							function(assoc)
							{
								return	assoc.type	==	src_assoc.type
									&&	assoc.target==	src_spec.storage.name
							}
						)

				if(!found)
					throw  ('Error rel, maybe missing relationship.')

				var	rel_func
				=	src_assoc.type
						.replace(/-/gi,"_")
						.replace(/:/gi,"_")

				return	this[rel_func](found,src_assoc,src_data)
				}
		,	get_filter_related: 	function(collection,subcollection,data)
				{
					var	assoc
					=	_(spec[collection].associations)
							.find(
								function(assoc)
								{
									return	assoc.name 	==	subcollection
										||	assoc.target==	subcollection
								}
							)
					if(!assoc)
					{
						console.log('error: missing assoc using collection: <<'+collection+'>> subcollection: '+subcollection)	
						throw 'error: missing assoc using collection: <<'+collection+'>> subcollection: '+subcollection
					}

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
