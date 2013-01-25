var	Factory
=	function(
		_
	,	uritemplate
	)
	{
	return	function(server_config,spec)
		{
			var transforms_profiles
			=	{
					"*" :
					{
						embedded:
						{
							type: "full"
						}
					,	linked:
						{
							type: "full"
						}
					,	collection: 
						{
							type: "pageable"
						,	ipp: 20
						,	
						}
					}
				,	partial :
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

			var	get_profile
			=	function(assoc)
				{
					return	_.isString(assoc.profile)
							?	transforms_profiles[assoc.profile]
							:	transforms_profiles.none
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

					_(transform_spec.associations)
					.each(
						function(assoc,assoc_key)
						{
							var	profile
							=	get_profile(assoc)

							assoc.name
							=	assoc_key

							assoc.embedded
							=	_.isObject(assoc.embedded)
								?	_(profile.embedded)
									.extend(
										assoc.embedded
									)
								:	_.isString(assoc.embedded)
									?	_(profile.embedded)
										.extend(
											{
												type: assoc.embedded
											}
										)
									:	profile.embedded

							assoc.embedded.collection
							=	_.has(assoc.embedded,"collection")
								?	_(profile.collection)
									.extend(
										assoc.embedded.collection
									)
								:	_(profile.collection)

							assoc.linked
							=	_.isObject(assoc.linked)
								?	_(profile.linked)
									.extend(
										assoc.linked
									)
								:	profile.embedded

							assoc.get_resource_url
							=	function(data)
								{
									return	uritemplate(
												_.isString(assoc.template)
												?	assoc.template
												:	transform_spec.api.templates.find_embedded
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
