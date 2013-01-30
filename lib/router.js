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
														key:'id'
													,	id:params.id
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
																	key: 'id'
																,	id: source.items[related.key]
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
															key: 'id'
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
						
						return	function(promised_data,query)
							{
								var	async_resolve_url
								=	function(url,assoc_key,source)
									{
										var	deferred
										=	Q.defer()

										router(
											url
										,	source
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
								,	recursive_reduce_list
								=	function(more,list,iteration,callback,source)
									{
										async_resolve_url(iteration.url,iteration.rel,source)
										.then(
											function(result)
											{
												more[iteration.rel] = result
												if (list.length > 0)
													recursive_reduce_list(
														more
													,	_.initial(list)
													,	list.pop()
													,	callback
													,	source
													)
												else
													callback(more)
											}
										)
									}
								,	async_get_links
								=	function(item)
									{
										var deferred
										=	Q.defer()

										deferred
											.resolve(
												_.objFilter(
													_(associations)
														.objMap(
															function(assoc,assoc_key)
															{	
																return	(!_.isNull(item[assoc.key]))
																	?	(assoc.linked.type != "none")
																			?	assoc.get_linked_resource_url(item)
																			:	assoc.get_resource_url(item)
																	: 	{}
															}
														)
												,	function(obj)
													{
														console.log(obj)
														return	!_.isEmpty(obj)
													}
												)
											)

										return deferred.promise
									}
								,	async_get_links_joined_embedded
								=	function(item)
									{
										var deferred
										=	Q.defer()

										async_get_links(item)
										.then(
											function(links)
											{
												var	list
												=	new Array()

												for (var attr in links)
														list
															.push(
																{
																	rel: attr
																,	url: links[attr]	
																}
															)

												recursive_reduce_list(
													{}
												,	_.initial(list)
												,	list.pop()
												,	function(result)
													{
														deferred
															.resolve(
																{
																	links:	
																		_.object(
																			_.keys(links)
																		,	_.values(links)
																		)
																,	embeddeds:	
																		_.object(
																			_.keys(result)
																		,	_.values(result)
																		)
																}
															)
													}
												,	item
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
										_(resolved_data.items).isArray()
											?	deferred.resolve(
													async_build_many(
														resolved_data
													)
												)
											:	deferred.resolve(
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
				=	function(url,source)
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