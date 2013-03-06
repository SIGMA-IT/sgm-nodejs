var	Factory
=	function(
		_
	,	uritemplate
	,	mappings
	,	transforms
	,	defaults
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
