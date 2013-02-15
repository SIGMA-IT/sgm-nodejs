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
		, 	check_specs: 	function(spec,spec_key,level,visited)
				{
					var self
					=	this

					_.map(
						spec.associations
					,	function(assoc,assoc_key)
						{
							self.check_assocs(
								{
									spec:spec
								,	key:spec_key	
								}
							,	{
									spec:transforms[assoc.target]
								,	key:assoc_key	
								}
							,	level
							,	visited
							)		
						}
					)
				}
		,	getKeys: function(visited)
				{
					var keys
					=	_.map(
							visited
						,	function(obj)
							{
								return _.isObject(obj)
											?_.first(_.values(_.pick(obj,'key')))
											:obj
							}
						)
					return _.values(keys)
				}
		,	sinRepeticion: function(array)
				{
					var array
					= this.getKeys(array)

					return _.uniq(array).length == array.length
				}
		,	generate_object_cut: function(assoc_key)
				{
					return {assoc_key: assoc_key}
				}
		,	get_redefined_embedded_type: function(type)
				{
					return "none"
				}
		,	get_redefined_embedded_collection: function(type)
				{
					return "list"
				}
		,	generate_tupla: function(parent_spec,assoc_spec,level)
				{
					var key
					=	(level==0)
							?parent_spec.key
							:parent_spec.spec.storage.name+'.'+assoc_spec.key

					return {
						key: key
					,	target:assoc_spec.key
					,	level:level
					}
				}
		,	getSafeEmbeddedType: function(tupla)
				{
					var embedded_profiles
					=	["none","single","partial","full"]
				 
					return 	_.first(
								_.last(
									embedded_profiles
								,	tupla.level
								)
							)
				}
		,	redefine_assoc_embedded: function(parent_spec,tupla_obj)
				{
					var splitted
					=	tupla_obj.key.split(".")
					,	key
					=	(splitted.length>1)
							?splitted[1]
							:tupla_obj.key
					,	assoc
					=	parent_spec.spec.associations[key]
					,	old_embedded_value
					=	!_.isUndefined(assoc)
							?assoc.embedded.type
							:this.get_redefined_embedded_type()


				 	if(!_.isUndefined(assoc) && old_embedded_value !=this.get_redefined_embedded_type())
				 	{
				 		_.extend(
							assoc.embedded
						,	{
								type: this.getSafeEmbeddedType(tupla_obj)
							}
						)

						console.log("Circular Reference in spec: "+parent_spec.spec.storage.name+" assoc: "+tupla_obj.key)
						console.log("Edited assoc embedded type from: "+old_embedded_value+" to: "+assoc.embedded.type)
				 	}
				}
		,	check_assocs: 	function(parent_spec,assoc_spec,level,visited)
				{
					var self
					=	this
					,	key
					=	self.generate_tupla(parent_spec,assoc_spec,level).key

					if(
						_.contains(
							self.getKeys(visited)
						,	key
						)
					)
					{
						visited.push(assoc_spec.key)
						self.redefine_assoc_embedded(
								parent_spec
							,	self.generate_tupla(parent_spec,assoc_spec,level)
						)
					}
					else{
						visited.push(self.generate_tupla(parent_spec,assoc_spec,level))		
					}
					
					level
					=	++level

					if (self.sinRepeticion(visited) && _.isObject(_.last(visited)))
					{
						visited
						=	_.union(
									visited
								,	self.check_specs(
											assoc_spec.spec
										,	assoc_spec.key
										,	level
										,	visited
									)
							)
					}

					return visited
				}
		,	get_key: function(assoc)
				{
					return 	this.valid_sintax[assoc.type].key
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
