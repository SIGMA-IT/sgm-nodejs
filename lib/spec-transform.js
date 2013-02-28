var	Factory
=	function(
		_
	,	uritemplate
	,	mappings
	,	transforms
	)
	{
	return	function(server_config,spec)
		{
			var transforms_profiles
			=	{
					partial :
					{
						embedded:
						{
							type: "partial"
						}
					,	linked:
						{
							type: "partial"
						}
					,	collection: 
						{
							type: "pageable"
						,	ipp: 10
						,	
						}
					}
				,	single :
					{
						embedded:
						{
							type: "single"
						}
					,	linked:
						{
							type: "single"
						}
					,	collection: 
						{
							type: "pageable"
						,	ipp: 5
						,	
						}
					}
				,	none :
					{
						embedded:
						{
							type: "none"
						}
					,	linked:
						{
							type: "none"
						}
					,	collection: "none"
					}
				}
			,	transfoms_default_list
			=	{
					type: 'list'
				}
			,	valid_optional_assoc_sintax
			=	{
					'has-many':{
						required: ['target', 'target_key']
					,	optional: ['key']
					,	key: 'id'
					}
				,	'has-one':{
						required: ['target', 'target_key']
					,	optional: ['key']
					,	key:'id'
					}
				,	'belongs-to':{
						required: ['target', 'key']
					,	optional: ['target_key']
					,	target_key:'id'
					}
				,	'has-many:through':{
						required: [ 'through', 'target']
					,	optional: ['key','target_key']
					,	key:'id'
					,	target_key:'id'
					}
				,	'has-one:through':{
						required: ['through', 'target']
					,	optional: ['key','target_key']
					,	key:'id'
					,	target_key: 'id' 
					}
				}
			,	get_profile
			=	function(assoc)
				{
					return	_.isString(assoc.profile)
							?	transforms_profiles[assoc.profile]
							:	transforms_profiles.none
				}
			,	get_assoc_sintax
			=	function(assoc)
				{
					return valid_optional_assoc_sintax[assoc.type]
				}

			_(spec)
			.each(
				function(transform_spec,transform_entry)
				{
					_(transform_spec)
					.defaults(
						{
							api:
							{
								uri : 	'/'+transform_entry
							,	server : server_config
							,	templates :
								{
									find_one : "{protocol}://{host}:{port}{+base}{/path,id}"
								,	find_embedded : "{protocol}://{host}:{port}{+base}{/path,id}{/embedded}"
								,	query : transform_entry+"{?query*}"
								,	linked : "{assoc_name}_{+name}"
								}
							,	get_resource_url:
								function(data)
								{
									return	uritemplate(
												this.templates.find_one
											)
											.expand(
												_.extend(
													{}
												,	this.server
												,	{
														path: transform_entry
													}
												,	data
												)
											)
								}
							}
						,	type: "has-many"
						,	associations:	(transform_spec.associations)
											?	transform_spec.associations
											:	{}
						}
					)

					transform_spec.profile
					=	(_.isUndefined(transform_spec.profile))
						?	transforms_profiles
						:	_(transforms_profiles)
								.objMap(
									function(profile_data,profile_key)
									{
										return	_(profile_data)
												.extend(
													_.isObject(transform_spec.profile[profile_key])
													?	transform_spec.profile[profile_key]
													:	{}
												)
									}
								)

					transform_spec.collection
					=	(_.isUndefined(transform_spec.collection))
						?	transfoms_default_list
						: 	(_.isUndefined(transform_spec.profile))
							?	transform_spec.collection
							:	_.extend(
									{}
								,	transforms_profiles[transform_spec.profile]
								,	transform_spec.collection
								)

				}
			)

			_(spec)
			.each(
				function(transform_spec,transform_entry)
				{
					_(transform_spec.associations)
					.each(
						function(assoc,assoc_key)
						{
							var	profile
							=	get_profile(assoc)
							,	default_assoc_sintax
							=	get_assoc_sintax(assoc)

							assoc.name
							=	assoc_key

							assoc.source
							=	transform_entry

							if (_.isUndefined(default_assoc_sintax))
								console.log("rel-type: invalid relation type "+assoc.type+" | <<"+assoc.source+":"+assoc.name+">>")

							assoc.embedded
							=	_.isObject(assoc.embedded)
								?	_.extend(
										{}
									,	profile.embedded
									,	(assoc.type!="belongs-to")
											?assoc.embedded
											:transforms_profiles.none.embedded
									)
								:	_.isString(assoc.embedded)
									?	_(profile.embedded)
										.extend(
											(assoc.type!="belongs-to")
												?{type: assoc.embedded}
												:transforms_profiles.none.embedded
										)
									:	profile.embedded

							assoc.embedded.collection
							=	_.has(assoc.embedded,"collection")
								?	_.extend(
										{}
									,	profile.collection
									,	_.isString(assoc.embedded.collection)
										?	{
												type: assoc.embedded.collection
											}
										:	assoc.embedded.collection
									)
								:	_(profile.collection)

							if (_.isObject(assoc.linked))
							{
								assoc.get_linked_resource_url
								=	function(data)
									{
										return	uritemplate(
													spec[assoc.linked.target].api.templates.find_one
												)
												.expand(
													_.extend(
														{}
														,	spec[assoc.linked.target].api.server
														,	{
																id:	(assoc.linked.key)
																	?	data[assoc.linked.key]
																	:	data.id
															,	path: assoc.linked.target
															}
													)
												)
									}
								assoc.get_linked_rel
								=	function(data)
									{
										return	uritemplate(
													_.isString(assoc.linked.template)
														?assoc.linked.template
														:spec[assoc.linked.target].api.templates.linked
												)
												.expand(
													_.extend(
														{}
														,	{
																assoc_name	: assoc.name
															,	name:	(assoc.linked.target_attr.name)
																		?	data[assoc.linked.target_attr.name]
																		:	data.name
															}
													)
												)
									}
								assoc.get_linked
								=	function(data)
									{
										return	_.extend(
													_.objMap(
														assoc.linked.target_attr
													,	function(value,attr)
														{
															return data[value]
														}
													)
												,	{
														href: assoc.get_linked_resource_url(data)
													}
												)
									}
							}

							assoc.linked
							=	_.isObject(assoc.linked)
								?	_.extend(
										{}
									,	profile.linked
									,	assoc.linked
									)
								:	profile.linked
								
							assoc.get_resource_url
							=	function(data)
								{
									var is_valid
									=	function(template)
									{
										return _.isString(template) && template.indexOf("{protocol}://{host}:{port}{+base}")>=0
									}
									var valid_template
									=	is_valid(assoc.template)
												?	assoc.template
												:	transform_spec.api.templates.find_embedded

									return	uritemplate(
												valid_template
											)
											.expand(
												_.extend(
													{}
												,	data
												,	transform_spec.api.server
												,	{
														path: transform_entry
													,	embedded: assoc_key
													}
												)
											)
								}

							// 	CHECK DE REQUIRED
							_.each(
								default_assoc_sintax.required
							,	function(require)
								{
									if	(!_.has(assoc,require))
										console.log('error assoc_rel: missing required field <<'+assoc[require]+'>> in assoc: '+assoc.name)
								}
							)

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

							// 	CHECK DE REQUIRED IN MAPPINGS
							_.each(
								_.difference(default_assoc_sintax.required,['through', 'target'])
							,	function(require)
								{
									var	mapping_key
									=	(require.split('_').indexOf('through') != -1)
										?	transforms[assoc.through].storage.name
										:	(require.split('_').indexOf('target') != -1)
											?	transforms[assoc.target].storage.name
											:	transforms[assoc.source].storage.name

									if	(!_.has(mappings[mapping_key].fields,assoc[require]))
										console.log('error assoc_rel: missing field <<'+assoc[require]+'>> in mapping: '+mapping_key)
								}
							)

							// 	CHECK DE OPTIONALS IN MAPPING
							_.each(
								default_assoc_sintax.optional
							,	function(option)
								{
									if (assoc[option] != 'id')
									{
										var	mapping_key
										=	(option.split('_').indexOf('target') != -1)
											?	transforms[assoc.target].storage.name
											:	transforms[assoc.source].storage.name

										if	(!_.has(mappings[mapping_key].fields,assoc[option]))
											console.log('error assoc_rel: missing optional field <<'+assoc[option]+'>> in mapping: '+mapping_key)
									}
								}
							)
						}
					)

					if (_.isString(transform_spec.template))
							transform_spec.api.templates.find_one
							=	transform_spec.template
				}
			)
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.SpecTransformsFactory
	=	Factory
else
	module.exports
	=	Factory
