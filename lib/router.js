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
						return	function(params)
							{
								return	(params.id && !params.subcollection)
										?	store.find(
												params.collection
											,	_.extend(
													{
														key:'id'
													,	id:params.id
													}
													,	params.query
												)
											)
										:	(params.id && params.subcollection)
											?	store.filter(
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
												)
											:	store.filter(
													params.collection
												,	{}
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
						
						return	function(data)
							{
								var	recursive_reduce_list
								=	function(more,list,iteration,callback)
									{
										async_resolve_url(iteration.url,iteration.rel)
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
													)
												else
													callback(more)
											}
										)
									}
								,	async_resolve_url
								=	function(url,assoc_key)
									{
										var	deferred
										=	Q.defer()

										Q.spread(
											[
												router(
													url
												)
											]
										,	function(result)
											{
												deferred
													.resolve(
														result
													)
											}
										)

										return deferred.promise
									}
								,	async_get_links
								=	function(item)
									{
										var deferred
										=	Q.defer()

										deferred
											.resolve(
												_(associations)
													.objMap(
														function(assoc_spec,assoc_key)
														{	
															return	_.isObject(assoc_spec.linked)
																	?	assoc_spec
																			.get_resource_url(
																				_.extend(
																					item
																				,	{
																						collection: assoc_spec.name
																					}
																				)
																			)
																	:	assoc_spec
																			.get_resource_url(
																				item
																			)
														}
													)
											)

										return deferred.promise
									}
								,	async_get_embedded
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
																result
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

										deferred
											.resolve(
												Q.spread(
													[
														async_get_links(item)
													,	async_get_embedded(item)
													]
												,	function (links, embeddeds)
													{
			        									return	hal_result
				        											.link(
				        												_.object(
				        													_.keys(links)
				        												,	_.values(links)
				        												)
				        											)
				        											.embedded(
				        												_.object(
				        													_.keys(embeddeds)
				        												,	_.values(embeddeds)
				        												)
				        											)
			    									}
			    								)
											)

										return deferred.promise
									}
								,	async_build_many
								=	function(items)
									{
										var	deferred
										=	Q.defer()

										deferred
											.resolve(
												new hal_collection_builder(
														{
															items: items
														}
													,	{
															collection_url: api.get_resource_url()
														}
													,	'pageable'
												)
											)

										return deferred.promise
									}

								var deferred = Q.defer()

								_(data).isArray()
									?	deferred.resolve(
											async_build_many(
												data
											)
										)
									:	deferred.resolve(
											async_build_one(
												data
											)
										)

								return deferred.promise
							}
						}
					)
				var	router
				=	function(url)
					{
					console.log("router.profile",url)
					var	parsed_original
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
					,	deferred
					=	Q.defer()
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
						deferred
							.resolve(
								builder(
									query(parsed)
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