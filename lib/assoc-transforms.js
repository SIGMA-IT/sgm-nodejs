var	Factory
=	function(
		_
	,	mappings
	,	transforms
	,	defaults
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
						console.log('error: unknown assoc type '+assoc.type+' <<'+spec_key+':'+assoc_key+'>>')
					
					// 	CHECK REQUIRED
					self.check_required(
							assoc
						,	assoc_key
						,	default_sintax[assoc.type].required
						)

					// 	CHECK MAPPINGS REQUIRED
					self.check_mapping_required(
							assoc
						,	spec_key
						,	_.difference(
								default_sintax[assoc.type].required
							,	['through', 'target']
							)
						)

					// 	CHECK MAPPINGS OPTIONALS
					self.check_mapping_optional(
							assoc
						,	spec_key
						,	default_sintax[assoc.type].optional
						)

				}
			,	check_required: function(assoc,assoc_key,required)
				{
					_.each(
						required
					,	function(require)
						{
							if	(!_.has(assoc,require))
								console.log('error assoc_rel: missing required field <<'+require+'>> in assoc: '+assoc_key)
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
								console.log('error assoc_rel: missing field <<'+assoc[require]+'>> in mapping: '+mapping_key)
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
									console.log('error assoc_rel: missing optional field <<'+assoc[option]+'>> in mapping: '+mapping_key)
							}
						}
					)
				}
			,	check_relation: function(assoc,assoc_key)
				{
					//	CHECK All Relations Defined
					if (	_.contains(
								["has-many","has-one"]
							,	_.first(
									assoc.type.split(':')
								)
							)
						)
							_.isUndefined(assoc.through)
							?	this.check_relation_target(assoc)
							:	this.check_relation_through(assoc)
				}
			,	check_relation_target: function(assoc)
				{
					if	(
							_.isUndefined(
								_.find(
									transforms[assoc.target].associations
								,	function(target_assoc,target_assoc_key)
									{
										return	target_assoc.target == assoc.source
											&&	_.first(
													target_assoc.type.split(':')
												) == "belongs-to" 
									}
								)
							)
						)
							console.log("rel-type: incomplete relation, missing relation belongs-to <<"+assoc.source+":"+assoc.name+"->"+assoc.target+">>")
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
							console.log("error: incomplete relation, missing relation belongs-to <<"+assoc.source+":"+assoc.name+"->"+assoc.through+">>")
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
							console.log("error: incomplete relation, missing relation has-one or has-many to be used as through <<"+assoc.source+":"+assoc.name+"->"+assoc.through+">>")
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
								console.log("error: incomplete relation, missing relation belongs-to <<"+assoc.source+":"+assoc.name+"->"+assoc.through+">>")
					}
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
						=	_.omit(
								spec.associations
							,	inherit_assoc.name
							)
						_.extend(
							spec.associations
						,	transforms[inherit_assoc.target].associations
						)
						this.check_inheritance(spec,spec_key)
					}
				}
			,	get_profile: function(assoc)
				{
					return	_.isString(assoc.profile)
							?	defaults.profiles[assoc.profile]
							:	defaults.profiles.none
				}
			,	redefine_assoc_attr: function(toRedefine,profile)
				{
					if (_.isString(toRedefine))
						toRedefine = _.object(["type"],[toRedefine])
					if (_.isUndefined(toRedefine))
						toRedefine = new Object()
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

					assoc.name
					=	assoc_key

					assoc.source
					=	spec_key

					assoc.embedded
					=	this.redefine_assoc_attr(assoc.embedded,profile.embedded)

					assoc.embedded.collection
					=	this.redefine_assoc_attr(assoc.embedded.collection,profile.collection)

					assoc.linked
					=	this.redefine_assoc_attr(assoc.linked,profile.linked)

					assoc.key
					=	_.isUndefined(assoc.key)
						?	default_assoc_sintax.key
						:	assoc.key

					assoc.target_key
					=	_.isUndefined(assoc.target_key)
						?	default_assoc_sintax.target_key
						:	assoc.target_key

					if (assoc.through)
						assoc.through_key
						=	_.isUndefined(assoc.through_key)
							?	default_assoc_sintax.through_key
							:	assoc.through_key
				}
			,	check_spec: function(spec,spec_key)
				{
					var self
					=	this
					,	visited_specs
					=	new Array(spec_key)

					// CHECKEO DE HERENCIA
					this
						.check_inheritance(
							spec
						,	spec_key
						)

					if (!_.isUndefined(spec.associations))
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
								// CHECKEO LAS RELACIONES
								self
									.check_relation(
										assoc
									,	assoc_key
									)
							}
						)

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
			,	get_filter: 	function(collection,association,data)
				{
					var	src_assoc
					=	spec[collection].associations[association]
					,	src_data
					=	data					 	
					
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
						console.log('Error rel, maybe missing relationship.')

					var	through
					=	src_assoc.type.replace(/-/gi,"_").split(":")

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
						console.log('error: missing assoc using collection: <<'+collection+'>> subcollection: '+subcollection)	

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
								return	t_assoc.source == assoc.target
									&&	t_assoc.target == assoc.source
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
							,	relation: target_assoc.type
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
