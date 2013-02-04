var	Factory
=	function(
		_
	,	hal
	,	hal_builder
	,	hal_collection_builder
	,	parseUri
	,	Q
	)
	{
	return	function(assoc_transforms,store,spec)
		{
			this.get_router
			=	function()
				{
				var	spec_store
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
						var	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations

						return	function(params,source)
							{
								var	getFilter
								=	function(params,source)
									{
										var related
										=	assoc_transforms
												.get_filter_related(
													params.collection
												,	params.subcollection
												,	params
												)
										,	deferred
										=	Q.defer()
										
										if(_.isUndefined(source))
											store.find(
												params.collection
											,	_.extend(
													{
														key: related.target_key
													,	id: params.id
													}
												)
											)
											.then(
												function(source)
												{
													deferred
														.resolve(
															_.extend(
																{
																	key: related.target_key
																,	id: params.id
																}
															,	params.query
															)
														)
												}
											)
										else
											deferred
												.resolve(
													_.extend(
														{
															key: related.target_key
														,	id: source[related.key]
														}
													,	params.query
													)
												)

										return deferred.promise
									}
								,	deferred
								=	Q.defer()



								if (params.id && _.isString(params.subcollection))
									getFilter(params,source)
									.then(
										function(filter)
										{
											deferred
												.resolve(
													store.filter(
														transform_entry
													,	filter
													)
												)
										}
									)
								else 
									if 	(params.id && !_.isString(params.subcollection))
											deferred
												.resolve(
													store.find(
														params.collection
													,	_.extend(
															{
																key:'id'
															,	id:params.id
															}
															,	params.query
														)
													)
												)
									else
										deferred
											.resolve(
												store.filter(
													params.collection
												,	params.query
												)
											)

								return deferred.promise	
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
						
						return	function(promised_data,query,profile)
							{
								var	async_resolve_linked
								=	function(assoc,item)
									{
										var	deferred
										=	Q.defer()

										if (assoc.linked.type == "none")
											deferred
												.resolve(
													_.object(
														[assoc.name]
													,	[assoc.get_resource_url(item)]
													)
												)
										else 
											router(
												assoc.get_resource_url(item)
											,	item
											,	"partial"//return collection items, not resource
											)
											.then(
												function(result)
												{
													deferred
														.resolve(
															_.object(
																[assoc.name]
															,	[_.map(
																	result.items
																,	function(link)
																	{
																		return	assoc.get_linked(link)
																	}
																)]
															)
													 	)
												}
											)

										return deferred.promise
									}
								,	async_resolve_embedded
								=	function(link,source,type)
									{										
										var deferred
										=	Q.defer()

										router(
											_.last(
												_.values(link)
											)
										,	source
										,	type
										)
										.then(
											function(result)
											{
												deferred
													.resolve(
														result
													)
											}
										)

										return deferred.promise
									}
								,	async_resolve_linked_nested
								=	function(assoc,linked_type,embedded_type,assoc_generic_link,item)
									{
										var	deferred
										=	Q.defer()

										async_resolve_embedded(assoc_generic_link,item,embedded_type)
										.then(
											function(result)
											{
												var links
												=	_.object(
														_.keys(assoc_generic_link)
													,	[
														_.map(
															result.resource._embedded.collection
														,	function(item)
															{
																return	assoc.get_linked(item)
															}
														)
														]
													)
												if (embedded_type != "none")
													deferred
														.resolve(
															_.object(
																['links','embedded']
															,	[
																	links
																,	_.object(
																		_.keys(assoc_generic_link)
																	,	[result]
																	)
																]
															)
														)
												else
													deferred
														.resolve(
															_.object(
																['links']
															,	[links]
															)
														)
											}
										)

										return deferred.promise
									}
								,	async_resolve_linked_single
								=	function(assoc,linked_type,embedded_type,assoc_generic_link,item)
									{
										var	deferred
										=	Q.defer()

										async_resolve_embedded(assoc_generic_link,item)
										.then(
											function(result)
											{
												deferred
													.resolve(
														result
													)
											}
										)


										return deferred.promise
									}
								,	async_resolve_linked_none
								=	function(assoc,linked_type,embedded_type,assoc_generic_link,item)
									{
										var	deferred
										=	Q.defer()

										if (embedded_type != "none")
											async_resolve_embedded(assoc_generic_link,item,embedded_type)
											.then(
												function(resolved_embeddeds)
												{
													deferred
														.resolve(
															{
																links:	assoc_generic_link
															,	embeddeds:	_.object(
																				_.keys(assoc_generic_link)
																			,	[resolved_embeddeds]
																			)
															}
														)
												}
											)
										else
											deferred
												.resolve(
													{
														links: assoc_generic_link
													}
												)

										return	deferred.promise
									}
								,	async_resolve_assoc
								=	function(assoc_key,item,merge)
									{
										var deferred
										=	Q.defer()
										,	link_function
										=	eval('async_resolve_linked_'+associations[assoc_key].linked.type)

										link_function(
											associations[assoc_key]
										,	associations[assoc_key].linked.type
										,	associations[assoc_key].embedded.type
										,	_.object(
												[assoc_key]
											,	[associations[assoc_key].get_resource_url(item)]
											)
										,	item
										)
										.then(
											function(resolved)
											{
												_(merge.links)
													.extend(
														resolved.links
													)
												_(merge.embeddeds)
													.extend(
														resolved.embeddeds
													)

												deferred
													.resolve(
														merge	
													)
											}
										)

										return deferred.promise
									}
								,	async_get_links_joined_embedded
								=	function(item)
									{
										var deferred
										=	Q.defer()

										_.initial(
											_.keys(associations)
										).reduce(
											function (soFar, iteration)
											{
												return	soFar
														.then(
															function(result)
															{
																return async_resolve_assoc(iteration,item,result)
															}
														)
											}
										,	async_resolve_assoc(
												_.last(
													_.keys(associations)
												)
											,	item
											,	{ links: {}, embeddeds: {}}
											)
										).then(
											function(result)
											{
												deferred
													.resolve(
														{
															links:	
																_.object(
																	_.keys(result.links)
																,	_.values(result.links)
																)
														,	embeddeds:	
																_.object(
																	_.keys(result.embeddeds)
																,	_.values(result.embeddeds)
																)
														}
													)
											}
										)

										return deferred.promise
									}
								,	async_build_one
								=	function(item)
									{
										var	deferred
										=	Q.defer()

										var	hal_result
										=	new hal_builder(
												item
											,	api.get_resource_url(item)
											)

										async_get_links_joined_embedded(item)
										.then(
											function(result)
											{
												deferred
													.resolve(
														hal_result
															.link(
																result.links
															)
															.embedded(
																result.embeddeds
															)
													)
											}
										)

										return deferred.promise
									}
								,	async_build_many
								=	function(data)
									{
										var	deferred
										=	Q.defer()

										deferred
											.resolve(
												new hal_collection_builder(
														data
													,	_.extend(
															{
																collection_url: api.get_resource_url()
															}
														,	transform_spec.collection
														,	query
														)
													,	_.has(query, "type") 
														?	query.type
														: 	transform_spec.collection.type
												)
											)

										return deferred.promise
									}

								var deferred = Q.defer()

								promised_data
								.then(
									function(resolved_data)
									{
										(profile == "none")
										?	deferred
												.resolve(
													resolved_data
												)
										:	_(resolved_data.items).isArray()
											?	deferred
													.resolve(
														async_build_many(
															resolved_data
														)
													)
											:	deferred
													.resolve(
														async_build_one(
															resolved_data.items
														)
													)
									}
								)

								return deferred.promise
							}
						}
					)
				var	router
				=	function(url,source,profile)
					{
					console.log("router.profile",url)
					var	parsed_original
					=	parseUri(url)
					,	parsed_url
					=	parsed_original.path
					,	base
					=	'/api/data'
					,	base_parts
					=	parsed_url.match(RegExp('^'+base+'(.*)$'))
					,	parts
					=	base_parts
							?base_parts[1].match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
							:{}
					,	deferred
					=	Q.defer()
					,	collection_params
					=	new Object()
					_.each(
						['type','page','ipp']
					,	function(val,index)
						{
							if	(!_.isUndefined(parsed_original.queryKey[val]))
									collection_params[val] = parsed_original.queryKey[val]
							else
								if 	(!_.isUndefined(spec[parts[1]].collection[val]))
										collection_params[val] = spec[parts[1]].collection[val]
						}
					)
					var	parsed
					=	{
							collection: spec[parts[1]].storage.name
						,	id:parts[2]
						,	subcollection:	_.isUndefined(parts[3])
											?	parts[3]
											:	spec[parts[1]].associations[parts[3]].target
						,	query:collection_params
						}
					if(parts)
					{
						var	item
						=	parsed.subcollection
								?spec[parsed.collection]
									.associations[parts[3]]
									.target
								:parsed.collection
						,	query
						=	spec_store[item]
						,	builder
						=	spec_builders[item]
						deferred
							.resolve(
								builder(
									query(parsed,source)
								,	parsed.query
								,	profile
								)
							)
					} else
						deferred
							.resolve(
								function()
								{
									return 404
								}
							)

					return	deferred.promise
					}
				return	router
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.RouterFactory
	=	Factory
else
	module.exports
	=	Factory