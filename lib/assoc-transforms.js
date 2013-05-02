var	Factory
=	function(
		_
	,	mappings
	,	transforms
	,	defaults
	,	logger
	)
	{
	return	function(store,spec)
		{
			return {

				check_sintax: function(assoc,assoc_key,spec_key)
				{
					var	self
					=	this
					,	default_sintax
					=	defaults.assoc_type

					//	CHECK TYPE
					if (_.isUndefined(default_sintax[assoc.type]))
						logger.warning('Unknown assoc type '+assoc.type+' <<'+spec_key+'>>:<<'+assoc_key+'>>')
					
					//	CHECK ASSOC VALUES
					self.check_values(
							assoc
						,	assoc_key
						,	defaults.assocs
						)

					// 	CHECK REQUIRED
					self.check_required(
							assoc
						,	assoc_key
						,	default_sintax[assoc.type].required
						)

					// 	CHECK MAPPINGS REQUIRED
					self.check_mapping_required(
							assoc
						,	_.isUndefined(assoc.parent)
							?	spec_key
							:	assoc.parent
						,	_.difference(
								default_sintax[assoc.type].required
							,	['through', 'target']
							)
						)

					// 	CHECK MAPPINGS OPTIONALS
					self.check_mapping_optional(
							assoc
						,	_.isUndefined(assoc.parent)
							?	spec_key
							:	assoc.parent
						,	default_sintax[assoc.type].optional
						)

				}
			,	check_values: function(assoc,assoc_key,defaults)
				{
					var	unknown_fields
					=	_.difference(
							_.keys(assoc)
						,	_.values(defaults)
						)
					if (!_.isEmpty(unknown_fields))
						_.each(
							unknown_fields
						,	function(field)
							{
								logger.warning('Unknown field <<'+field+'>> in assoc: <<'+assoc_key+'>>')
							}
						)
				}
			,	check_required: function(assoc,assoc_key,required)
				{
					_.each(
						required
					,	function(require)
						{
							if	(!_.has(assoc,require))
								logger.error('Missing required field <<'+require+'>> in assoc: <<'+assoc_key+'>>')
						}
					)
				}
			,	check_mapping_required: function(assoc,source,mapping_required)
				{
					_.each(
						mapping_required
					,	function(require)
						{
							var	mapping_key
							=	(require.split('_').indexOf('target') != -1)
								?	transforms[assoc.target].storage.name
								:	transforms[source].storage.name

							if	(!_.has(mappings[mapping_key].fields,assoc[require]))
								logger.error('Missing field <<'+assoc[require]+'>> in mapping: <<'+mapping_key+'>>')
						}
					)
				}
			,	check_mapping_optional: function(assoc,source,mapping_optional)
				{
					_.each(
						mapping_optional
					,	function(option)
						{
							if (assoc[option] != 'id' && assoc[option] != undefined)
							{
								var	mapping_key
								=	(option.split('_').indexOf('target') != -1)
									?	transforms[assoc.target].storage.name
									:	transforms[source].storage.name

								if	(!_.has(mappings[mapping_key].fields,assoc[option]))
									logger.error('Missing optional field <<'+assoc[option]+'>> in mapping: <<'+mapping_key+'>>')
							}
						}
					)
				}
			,	check_relation_target: function(assoc)
				{
					if	(_.isUndefined(transforms[assoc.target]))
						logger.warning("Incomplete relation, missing entity <<"+assoc.target+">>")
					else
						if	(
								_.isUndefined(
									_.find(
										transforms[assoc.target].associations
									,	function(target_assoc,target_assoc_key)
										{
											return	target_assoc.target == assoc.source
												&&	(target_assoc.type == 'belongs-to')
													?	_.contains(['has-one','has-many'],assoc.type)
													:	assoc.type == "belongs-to"
										}
									)
								)
							)
								logger.warning("Incomplete relation, missing relation belongs-to <<"+assoc.source+">>:<<"+assoc.name+">>-><<"+assoc.target+">>")
				}
			,	check_relation_through: function(assoc)
				{
					if	(
							_.isUndefined(
								_.find(
									transforms[assoc.through].associations
								,	function(through_assoc,through_assoc_key)
									{
										return	through_assoc.target == assoc.source
											&&	_.first(
													through_assoc.type.split(':')
												) == "belongs-to"
									}
								)
							)
						)
							logger.warning("Incomplete relation, missing relation belongs-to <<"+assoc.source+">>:<<"+assoc.name+">>-><<"+assoc.through+">>")
					else {
						var	target_assoc
						=	_.find(
								transforms[assoc.through].associations
							,	function(through_assoc,through_assoc_key)
								{
									return	through_assoc.target == assoc.target
										&&	_.contains(
												["has-many","has-one"]
											,	_.first(
													assoc.type.split(':')
												)
											)
								}
							)
						if (_.isUndefined(target_assoc))
							logger.warning("Incomplete relation, missing relation has-one or has-many to be used as through <<"+assoc.source+">>:<<"+assoc.name+">>-><<"+assoc.through+">>")
						else
							if	(
								_.isUndefined(
									_.find(
										transforms[assoc.through].associations
									,	function(through_assoc,through_assoc_key)
										{
											return	through_assoc.target == assoc.source
												&&	_.contains(
														["has-many","has-one"]
													,	_.first(
															assoc.type.split(':')
														)
													)
										}
									)
								)
							)
								logger.warning("Incomplete relation, missing relation belongs-to <<"+assoc.source+">>:<<"+assoc.name+">>-><<"+assoc.through+">>")
					}
				}
			,	clone_array: function(array)
				{
					var	self
					=	this
					return	_.map(
								array
							,	function(value)
								{
									return	_.isArray(value)
											?	self.clone_array(value)
											:	_.isObject(value)
												?	self.clone_object(value)
												:	value
								}
							)
				}
			,	clone_object: function(obj)
				{
					var	self
					=	this
					return	_.objMap(
								obj
							,	function(value,attr)
								{
									return	_.isObject(value)
											?	self.clone_object(value)
											:	_.isArray(value)
												?	self.clone_array(value)
												:	value
								}
							)
				}
			,	check_inheritance: function(spec,spec_key)
				{
					var	inherit_assoc
					=	_.first(
							_.map(
								spec.associations
							,	function(assoc,assoc_key)
								{
									if (assoc.type == "is-a")
										return	{
													name: assoc_key
												,	target: assoc.target
												}
								}
							)
						)

					if (!_.isUndefined(inherit_assoc))
					{
						spec.associations 
						=	_.extend(
								_.objMap(
									this.clone_object(transforms[inherit_assoc.target].associations)
								,	function(obj)
									{
										return	_(obj)
													.extend(
														{
															parent: inherit_assoc.target	
														}
													)	
									}
								)
							,	_.omit(
									spec.associations
								,	inherit_assoc.name
								)
							)

						this.check_inheritance(spec,spec_key)
					}
				}
			,	get_profile: function(assoc)
				{
					var	profile
					=	_.isString(assoc.profile)
						?	defaults.profiles[assoc.profile]
						:	defaults.profiles.none
					if (_.isUndefined(profile))
						logger.warning("Unkown profile <<"+assoc.profile+">>")
					return	profile
				}
			,	redefine_assoc_attr: function(toRedefine,profile)
				{
					if (_.isString(toRedefine))
						toRedefine = _.object(["type"],[toRedefine])
					if (_.isUndefined(toRedefine))
						toRedefine = new Object()
					else
					{
						var	unknown_types
						=	_.difference(
								[toRedefine.type]
							,	defaults.types
							)
						if (!_.isEmpty(unknown_types))
							_.each(
								unknown_types
							,	function(type)
								{
									logger.warning('Unknown type <<'+type+'>>')
								}
							)
					}
					return	_.objMap(
								_.object(
									_.union(
										_.keys(profile)
									,	_.keys(toRedefine)
									)
								,	[]
								)
							,	function(value,attr)
								{
									return	_.isUndefined(toRedefine[attr])
											?	profile[attr]
											:	toRedefine[attr]
								}
							)
				}
			,	redefine_assoc: function(assoc,assoc_key,spec_key)
				{
					var profile
					=	this.get_profile(assoc)
					,	default_assoc_sintax
					=	defaults.assoc_values[assoc.type]

					_(assoc)
						.extend(
							{
								name:	assoc_key
							,	source:	spec_key
							,	embedded:	this.redefine_assoc_attr(assoc.embedded,profile.embedded)
							,	linked:	this.redefine_assoc_attr(assoc.linked,profile.linked)
							,	key:	_.isUndefined(assoc.key)
										?	default_assoc_sintax.key
										:	assoc.key
							,	target_key:	_.isUndefined(assoc.target_key)
											?	default_assoc_sintax.target_key
											:	assoc.target_key
							}
						)

					_(assoc.embedded)
						.extend(
							{
								collection: this.redefine_assoc_attr(assoc.embedded.collection,profile.collection)
							}
						)
				}
			,	check_spec: function(spec,spec_key)
				{
					var self
					=	this
					,	visited_specs
					=	new Array(spec_key)

					if (!_.isUndefined(spec.associations) && _.isUndefined(spec.source))
					{
						// CHECKEO DE HERENCIA
						this
							.check_inheritance(
								spec
							,	spec_key
							)
							_.each(
								spec.associations
							,	function(assoc,assoc_key)
								{
									// CHECKEO SINTAXIS (Required y Optionals vs Mappings)
									self
										.check_sintax(
											assoc
										,	assoc_key
										,	spec_key
										)
									// REDEFINE DE ASSOC
									self
										.redefine_assoc(
											assoc
										,	assoc_key
										,	spec_key
										)
									if (_.isUndefined(assoc.parent))
										// CHECKEO LAS RELACIONES EN CASO DE NO SER UNA RELACION HEREDADA
										_.isUndefined(assoc.through)
										?	self.check_relation_target(assoc)
										:	self.check_relation_through(assoc)
								}
							)
					}

					return visited_specs
				}
			,	get_through_path: function(src_assoc)
				{
					var	through_spec
					=	transforms[src_assoc.through]
					,	target_assoc_type
					=	(src_assoc.type.split(':')[0] == 'has-one')
						?	'has-one'
						:	'belongs-to'
					,	source_assoc
					=	_.find(
							through_spec.associations
						,	function(assoc,assoc_key)
							{
								return	assoc.target == src_assoc.source
									&&	assoc.type == "belongs-to"
							}	
						)
					,	target_assoc
					=	_.find(
							through_spec.associations
						,	function(assoc,assoc_key)
							{
								return	assoc.target == src_assoc.target
									&&	assoc.type.split(':')[0] == target_assoc_type
							}	
						)
					,	through_path
					=	_.flatten(
							_.isUndefined(target_assoc.type.split(':')[1])
							?	[
									{
										target: src_assoc.through
									,	key: source_assoc.key
									,	target_key: target_assoc.key
									}
								]
							:	this.get_through_path(target_assoc)
						)

					return through_path
				}
			,	get_filter: function(collection,association,data)
				{
					var	tgt_spec
					=	transforms[collection]
					,	src_assoc
					=	tgt_spec.associations[association]
					,	src_data
					=	data					 	
					,	src_spec
					=	transforms[src_assoc.target]
					,	through
					=	src_assoc.type.replace(/-/gi,"_").split(":")
					,	found
					=	_(tgt_spec.associations)
							.find(
								function(assoc)
								{
									return	assoc.type	==	src_assoc.type
										&&	assoc.target==	src_spec.name
								}
							)

					if(!found)
						logger.critical('Missing relationship <<'+collection+'>>:<<'+association+'>>.')

					return	{
								source:	found.source
							,	source_key:	'id'
							,	source_value: src_data.id
							,	key: found['key']
							,	target_key: found['target_key']
							,	through: 	(through.length > 1)
											?	this.get_through_path(src_assoc)
											:	[] 
							}
				}
			,	get_filter_related: function(collection,subcollection,data)
				{
					var	assoc
					=	spec[collection].associations[subcollection]
					if(!assoc)
						logger.critical('Missing assoc <<'+collection+'>>:<<'+subcollection+'>>.')	

					return	this.get_filter(
								collection
							,	assoc.name
							,	data
							)
				}
			,	get_inverse: function(assoc,item)
				{
					var	target_assoc
					=	_.find(
							spec[assoc.target].associations
						,	function(t_assoc,t_assoc_key)
							{
								return	t_assoc.source	==	assoc.target
									&&	(
										t_assoc.target	==	assoc.source
									||	t_assoc.target	==	assoc.parent	
										)
									&&	_.contains(
											_.contains(["has-many","has-one"],assoc.type)
											?	["belongs-to"]
											:	["has-many","has-one"]
										,	t_assoc.type
										)
							}
						)

					return	{	
								from: assoc.source
							,	to: assoc.target
							,	rel: target_assoc.type
							,	url: target_assoc.get_resource_url(item)
							}
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
