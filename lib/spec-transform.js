var	Factory
=	function(
		_
	,	hal
	,	hal_builder
	,	hal_collection_builder
	,	uritemplate
	,	parseUri
	,	AssocTransfoms
	)
	{
	return	function(store,spec)
		{
			this.store
			=	store
			this.spec
			=	spec
				_(this.spec)
				.each(
					function(transform_spec,transform_entry)
					{
						_(transform_spec.api)
						.extend(
							{
								get_url:
									function(data)
									{
									return	uritemplate(this.templates.find_one)
										.expand(
											_.extend(
												{}
											,	this.url
											,	data
											)
										)
									}
							}
						)
						_(transform_spec.associations)
						.each(
							function(association,assoc_key)
							{
								//ATENTI!!! PARCHE ROÑOSOOOO
								association.name=assoc_key
								if(	association.type=="has-many"
								)	association.template="{protocol}://{host}:{port}{+base}{/path,id}/"+association.name
								//ATENTI!!! PARCHE ROÑOSOOOO
								association.source=transform_spec
								if(!_.isObject(spec[association['target']]))
									throw "ERROR: '"+transform_entry+"': invalid 'target' in '"+ assoc_key  +"' association"
								_(['target','through'])
								.each(
									function(what)
									{
										if( _.isString(association[what]) )
										{
											spec[association[what]].name=association[what]
											association[what]=spec[association[what]]
										}
									}
								)
								if( _.isString(association.embeded) )
									association.embeded={type:association.embeded}
								if(association.template)
									_(association)
									.extend(
										{
											get_link:
												function(data)
												{
												return	uritemplate(this.template)
													.expand(
														_.extend(
															{}
														,	transform_spec.api.url
														,	data
														)
													)
												}
										}
									)
							}
						)
					}
				)
			var	assoc_transforms
			=	new AssocTransfoms(store,spec)
			this.get_router
			=	function()
				{
				var	store
				=	this.store
				,	spec
				=	this.spec
				var	spec_store
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
						var	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
						return	function(params,callback)
							{
								if(
									params.id
								&&	!params.subcollection
								)	store.find(
										params.collection
									,	_.extend(
											{
												key:'id'
											,	id:params.id
											}
											,	params.query
										)
									,	callback
									)
								else if(
									params.id
								&&	params.subcollection
								)	store.filter(
										transform_entry
									,	_.extend(
											assoc_transforms
											.get_filter_related(
												params.collection
											,	params.subcollection
											,	params
											)
											,	params.query
										)
									,	callback
									)
								else if(
									(!params.id)
								&&	(!params.subcollection)
								)	store.filter(
										params.collection
									,	{}
									/*
									,	assoc_transforms
										.get_filter(
											collection
										,	false
										,	false
										)
									*/
									,	callback
									)
							}
						}
					)
				var	spec_builders
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
						var	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
						,	profiles
						=	transform_spec.profiles
						
						return	function(data,profile)
							{
							var get_profile
							=	function(assoc_key)
								{
									return 'partial'
								}
							var	build_one
							=	function(data)
								{								
								var	hal_result
								=	new hal_builder(data,api.get_url(data))
								if (data != undefined)
								{
									var	associateds_nolinked
									=	new Array()
									,	associateds
									=	_(
											_(associations)
											.objMap(
												function(assoc_spec,assoc_key)
												{	
												return	assoc_transforms.get_url(assoc_spec,data)
												}
											)
										).objFilter(_.identity)
										if(
											(
												profile!='partial'
											)
										)	_.each(
												associateds
											,	function(assoc_url,assoc_key)
												{
													associateds_nolinked
													=	_(associateds)
														.objFilter(
															function(assoc_url,assoc_key)
															{
															return !_.isObject(associations[assoc_key].linked)
															}
														)
													if(
														(
															profile=='partial'
														)
													||	!associations[assoc_key].embeded
													)	return
													router(
														assoc_url
													,	'partial'//get_profile()
													,	function(items)
														{
															if (_.isObject(associations[assoc_key].linked))
															{
																_(items)
																	.objMap(
																		function(item)
																		{
																			router(
																				uritemplate(spec[associations[assoc_key].linked.target].api.templates.find_one)
																				.expand(
																					_.extend(
																						{}
																					,	spec[associations[assoc_key].linked.target].api.url
																					,	{
																							id:	(associations[assoc_key].linked.key)
																								?	item.resource[associations[assoc_key].linked.key]
																								:	item.resource.id
																						}
																					)
																				)
																			,	(associations[assoc_key].linked.embeded == "single")
																				?	"partial"
																				:	false
																			,	function(content)
																				{
																					if (content.resource.name != undefined)
																					{
																						if (_.isString(associations[assoc_key].linked.embeded))
																							hal_result
																							.embedded(
																								_.object(
																									[content.resource.name]
																								,	[content]
																								)
																							)
																						if (associations[assoc_key].linked.type == 'has-many')
																							hal_result
																							.link(
																								_.object(
																										[content.resource.name]
																									,	[content.resource._links[content.resource.name]]
																								)
																							)
																						else 
																						{	
																							hal_result
																							.link(
																								_.object(
																										[content.resource.name]
																									,	[_.extend(
																												_(associations[assoc_key].linked.target_attr)
																													.objMap(
																														function(i)
																														{
																															return 	item.resource[i]
																														}
																													)
																											,	{
																													href: content.resource._links.self.href
																												}
																											)
																										]
																								)
																							)
																						}
																					}
																				}
																			)
																		}
																	)
															} else
																{
																	if (
																		associations[assoc_key].embeded.type == "partial"
																	&&	associations[assoc_key].type != "belong-to"
																	)
																	{
																		router(
																			assoc_transforms.get_url(associations[assoc_key],data)
																		,	false
																		,	function(content)
																			{
																				hal_result
																					.embedded(
																						_.object(
																							[associations[assoc_key].name]
																						,	[content]
																						)
																					)
																			}
																		)
																	}
																	else 
																		hal_result
																		.embedded(
																			_.object(
																				[assoc_key]
																			,	[items]
																			)
																		)
																}
														}
													)
												}
											)
										hal_result
										.link(associateds_nolinked)
									}
								return	hal_result
								}
							,	build_many
							=	function(data)
								{
								var	data_items
								=	_(data).map(build_one)
									if(profile=='partial')
										return data_items
									else
									{
										return new hal_collection_builder(
												{items: data_items}
											,	{
													collection_url: api.get_url({})
												}
											,	'pageable'
										)
									}

								var	hal_result
								=	new hal_builder({},api.get_url({}))
									hal_result.embedded(
										_.object(
											[transform_entry]
										,	[data_items]
										)
									)
								return	hal_result
								}
							return	_(data).isArray()
									?build_many(data)
									:build_one(data)
							}
						}
					)
				var	router
				=	function(url,profile,filter_set)
					{
					console.log("router.profile",url,profile)
					var	cb
					=	_.last(arguments)
					,	parsed_original
					=	parseUri(url)
					,	parsed_url
					=	parsed_original.path
					,	collection_params
					=	{
							type:parsed_original.queryKey['type']||undefined
						,	page:parseInt(parsed_original.queryKey['page'])||1
						,	ipp:parseInt(parsed_original.queryKey['ipp'])||10
						}
					,	base
					=	'/api/data'
					,	base_parts
					=	parsed_url.match(RegExp('^'+base+'(.*)$'))
					,	parts
					=	base_parts
							?base_parts[1].match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
							:{}
					,	parsed
					=	{
							collection:parts[1]
						,	id:parts[2]
						,	subcollection:parts[3]
						,	query:collection_params
						}
						if(parts)
						{
						var	item
						=	parsed.subcollection
								?spec[parsed.collection]
									.associations[parsed.subcollection]
									.target.name
								:parsed.collection
						,	query
						=	spec_store[item]
						,	builder
						=	spec_builders[item]
							if(query)
							{
								query(
									parsed
								,	function(results)
									{
										cb(
											builder(results,profile)
										)
									}
								)
							}
							else
								cb(404)
						}
						else
							cb(404)
					}
				return	router
				}
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
