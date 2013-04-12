var	Factory
=	function(
		_
	,	uritemplate
	,	mappings
	,	transforms
	,	defaults
	,	logger
	)
	{
	return	function(server_config,spec)
		{
			var get_profile
			=	function(assoc)
				{
					return	_.isString(assoc.profile)
							?	defaults.profiles[assoc.profile]
							:	defaults.profiles.none
				}

			_(spec)
			.each(
				function(transform_spec,transform_entry)
				{
					var	unkown_fields
					=	_.difference(
							_.keys(transform_spec)
						,	_.values(defaults.specs)
						)
					if (!_.isEmpty(unkown_fields))
						_.each(
							unkown_fields
						,	function(attr)
							{
								logger.warning('Unknown field '+attr+' in transform <<'+transform_entry+'>>')
							}
						)

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
							,	get_msg:
								function(data)
								{
									return	uritemplate(
												"{protocol}://{host}:{port}{+base}{/path,code}"
											)
											.expand(
												_.extend(
													{}
												,	this.server
												,	{
														path: "msg"
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
						,	name: transform_entry
						}
					)

					transform_spec.profile
					=	(_.isUndefined(transform_spec.profile))
						?	defaults.profiles
						:	_(defaults.profiles)
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
						?	defaults.list
						: 	(_.isUndefined(transform_spec.profile))
							?	transform_spec.collection
							:	_.extend(
									{}
								,	defaults.profiles[transform_spec.profile]
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
							assoc.get_linked_resource_url
							=	function(data)
								{
									var	target
									=	_.isUndefined(assoc.linked.target)
										?	assoc.target
										:	assoc.linked.target
									
									return	uritemplate(
												spec[target].api.templates.find_one
											)
											.expand(
												_.extend(
													{}
													,	spec[target].api.server
													,	{
															id:	(assoc.linked.target_key)
																?	data[assoc.linked.target_key]
																:	data.id
														,	path: target
														}
												)
											)
								}

							assoc.get_linked_rel
							=	function(data)
								{
									var	templated_name
									=	_.isUndefined(assoc.linked.target_attr)
										?	data.id
										:	_.isUndefined(assoc.linked.target_attr.name)
											?	data.id
											:	data[assoc.linked.target_attr.name]

									return	uritemplate(
												_.isString(assoc.linked.template)
												?	assoc.linked.template
												:	spec[
															_.isUndefined(assoc.linked.target)
															?	assoc.target
															:	assoc.linked.target
														].api.templates.linked
											)
											.expand(
												_.extend(
														{
															assoc_name	: _.stringParser(assoc.name)
														,	name:	_.stringParser(templated_name)
														}
													,	_.isUndefined(assoc.linked.target_attr)
														?	{}	
														:	_.objMap(
																assoc.linked.target_attr
															,	function(value,attr)
																{
																	return _.stringParser(data[value])
																}
															)
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
								
							assoc.get_resource_url
							=	function(data)
								{
									var valid_template
									=	_.isString(assoc.template) && assoc.template.indexOf("{protocol}://{host}:{port}{+base}")>=0
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
