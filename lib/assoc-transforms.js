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
					,	target: 'target'
					,	optional: ['key']
					}
				,	'has-one':{
						required: ['target', 'key']
					,	target: 'target'
					,	optional: ['target_key']
					}
				,	'belongs-to':{
						required: ['target', 'key']
					,	target: 'target'
					,	optional: ['target_key']
					}
				,	'has-many:through':{
						required: [ 'through', 'target', 'through_key', 'target_key']
					,	target: 'through'
					,	optional: ['key']
					}
				,	'has-one:through':{
						required: ['through', 'target', 'key', 'through_key']
					,	target: 'through'
					,	optional: ['target_key']
					}
				,	'belongs-to:through':{
						required: ['through', 'target', 'through_key', 'target_key']
					,	target: 'through'
					,	optional: ['key']
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
			{
				var	attr_sintax
				=	this.valid_sintax[assoc.type]
				,	transforms_key
				=	(assoc.type=="belongs-to" || assoc.type=="has-one")
					?	spec_key
					:	assoc[attr_sintax.target]
				,	mapping_key
				=	(assoc.type=="belongs-to")
						?transforms_key
						:transforms[transforms_key].storage.name
				,	mapping
				=	mappings[mapping_key]

				if(assoc.key != 'id' && !_.has(mapping.fields,assoc.key))
				{
					console.log('error assoc_rel: missing field <<'+assoc.key+'>> in mapping: '+spec_key+':'+assoc_entry)
					throw 'error assoc_rel: missing field <<'+assoc.key+'>> in mapping: '+spec_key+':'+assoc_entry
				}
					
				
				return	(assoc.key == 'id')
						?	true
						:	_.has(
								mapping.fields
							,	assoc.key
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
							//checking circular reference
							self
								.check_assocs(
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

							//checking assoc_sintax
							self
								.check_assoc_sintax(
										assoc
									,	assoc_key
									,	spec.storage.name
								)
							//checking assoc_rel
							self
								.check_assoc_rel(
										assoc
									,	assoc_key
									,	spec.storage.name
								)
							//throw "STOP"		
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
											?(obj.level==0)
												?obj.key
												:_.first(_.values(_.pick(obj,'key'))).split(".")[1]
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
		,	get_redefined_embedded_type: function()
				{
					return "none"
				}
		,	get_redefined_embedded_collection: function()
				{
					return "list"
				}
		,	get_splitted_key: function(tupla_obj)
				{
					var splitted
					=	tupla_obj.key.split(".")
					,	key
					=	(splitted.length>1)
							?splitted[1]
							:tupla_obj.key

					return key
				}
		,	generate_tupla: function(last_one,parent_spec,assoc_spec,level)
				{

					var key
					=	(level==0)
							?parent_spec.key
							:this.get_splitted_key(last_one)+'.'+parent_spec.key

					return {
						key: key
					,	target:assoc_spec.key
					,	level:level
					}
				}
		,	getSafeEmbeddedType: function(type)
				{
					var embedded_profiles
					=	{
							'undefined': 'none'
						,	'none': 'none'
						,	'single': 'single'
						,	'partial': 'single'
						}

					return 	embedded_profiles[type]
				}
		,	redefine_assoc_embedded: function(parent_spec,tupla_obj)
				{
					var assocs
					=	parent_spec.spec.associations
					,	self
					=	this

				 	if(!_.isUndefined(assocs))
				 	{
				 		_.map(
				 			assocs
				 		,	function(assoc,assoc_key)
				 			{
								var	old_embedded_value
								=	!_.isUndefined(assoc)
										?assoc.embedded.type
										:'undefined'

								_.extend(
									assoc.embedded
								,	{
										type: self.getSafeEmbeddedType(old_embedded_value)
									}
								)

								if(old_embedded_value != self.get_redefined_embedded_type())
								{	
									console.log("Circular Reference in spec: " + assoc_key) //+parent_spec.spec.storage.name+" assoc: "+tupla_obj.key)
									console.log("Edited assoc embedded type from: "+old_embedded_value+" to: "+assoc.embedded.type)
								}
				 			}
				 		)
				 	}
				}
		,	get_key_from_joined: 	function(parent_spec,assoc_spec,level,visited)
				{
					var key_joined
					=	this.generate_tupla(_.last(visited),parent_spec,assoc_spec,level).key
					,	key_splitted
					=	key_joined.split(".")
					
					return _.last(key_splitted)
				}
		,	check_assocs: 	function(parent_spec,assoc_spec,level,visited)
				{
					var key
					=	(level==0)
							?parent_spec.key
							:this.get_key_from_joined(parent_spec,assoc_spec,level,visited)
					
					if(
						_.contains(
							this.getKeys(visited)
						,	key
						)
					)
					{	
						this.redefine_assoc_embedded(assoc_spec,_.last(visited))
						visited.push(false)
					}
					else{
						visited.push(
							this.generate_tupla(_.last(visited),parent_spec,assoc_spec,level)
						)		
					}
					
					level
					=	++level

					var canAdd
					= _.isObject(_.last(visited))

					_.isObject(_.last(visited))
						?_.identity(visited)
						:visited.pop()

					if (this.sinRepeticion(visited) && canAdd)
					{
						visited
						=	_.union(
									visited
								,	this.check_specs(
											assoc_spec.spec
										,	assoc_spec.key
										,	level
										,	visited
									)
							)
					}

					return visited
				}
		// ,	through: function(found,src_assoc)
		// 	{
		// 		return 	{
		// 					through:
		// 					{
		// 						name: src_assoc.through
		// 					,	target: src_assoc.target
		// 					,	target_key: found[src_assoc.through_key]
		// 					}
		// 				}
		// 	}
		// ,	belongs_to:	function(found,src_assoc,src_data)
		// 		{
		// 			return	{
		// 						source:	found.source
		// 					,	source_key:	'id'
		// 					,	source_value: src_data.id
		// 					,	key: found[src_assoc.key]
		// 					,	target_key: src_assoc.target_key
		// 					}	
		// 		}
		// ,	has_one:	function(found,src_assoc,src_data)
		// 		{
		// 			return	{
		// 						source:	found.source
		// 					,	source_key: 'id'
		// 					,	source_value: src_data.id
		// 					,	key : found[this.get_key(src_assoc)]
		// 					,	target_key: 'id'
		// 					}
		// 		}
		// ,	has_many:	function(found,src_assoc,src_data)
		// 	{
		// 		return	{
		// 					source:	found.source
		// 				,	source_key:	'id'
		// 				,	source_value: 	src_data.id
		// 				,	key: 'id'
		// 				,	target_key: found[this.get_key(src_assoc)]
		// 				}
		// 	}
		,	get_filter: 	function(collection,association,data)
			{
				var	src_assoc
				=	spec[collection].associations[association]
				,	src_data
				=	data

				//Check relationship on routing
				if(
					!this.check_assoc_sintax(src_assoc,src_data.subcollection)
				)
				{
					console.log("Error invalid assoc_rel: "+src_data.collection)
				 	throw "Error invalid assoc_rel: "+src_data.collection	
				}
				 	
				
				var	tgt_spec
				=	transforms[src_assoc.source]
				,	src_spec
				=	transforms[src_assoc.target]
				,	through
				=	src_assoc.type.indexOf("through") !== -1
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

				var	through
				=	src_assoc.type.replace(/-/gi,"_").split(":")

				return	_.extend(
							{
								source:	found.source
							,	source_key:	'id'
							,	source_value: src_data.id
							,	key: found['key']
							,	target_key: found['target_key']
							}
						,	(through.length > 1)
							?	{
									through:
									{
										name: src_assoc.through
									,	target: src_assoc.target
									,	target_key: found['through_key']
									}
								}
							:	{}
						)
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
