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
				var spec_methods
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
							return	{
										entry: transform_entry
									,	read: 	function(params)
												{
													var	deferred
													=	Q.defer()
													,	entry
													=	this.entry
													,	type
													=	_.isUndefined(params.subcollection)
															?	_.isUndefined(params.id)
																?	spec[params.collection].type
																:	'has-one'
															:	spec[params.collection].associations[params.association].type
																		
													var	getFilter
													=	function(params)
														{
															var related
															=	_.isUndefined(params.subcollection)
																?	{
																		key : 'id'
																	,	value: params.id
																	}
																:	assoc_transforms
																		.get_filter_related(
																			params.collection
																		,	params.subcollection
																		,	params
																		)
															,	type_functions
															=	{
																	'has-many':'filter'
																,	'has-one':'find'
																,	'belongs-to':'find'
																,	'has-many:through':'filter'
																,	'has-one:through':'find'
																,	'belongs-to:through':'find'
																}
															,	deferred
															=	Q.defer()

															_.extend(
																params
															,	{
																	through: related.through
																}
															)

															deferred
																.resolve(
																		{
																			query: 	_.extend(
																						_.pick(params,'collection_query','query','through')
																					,	related
																					)
																		,	function_name: type_functions[type]
																		,	entry: entry
																		}
																)

															return deferred.promise
														}

													getFilter(params)
													.then(
														function(filter)
														{
															deferred
																.resolve(
																	store[filter.function_name](
																		filter.entry
																	,	filter.query
																	)
																)
														}
													)

													return deferred.promise	
												}
									,	update:	function(params)
												{
													var	deferred
													=	Q.defer()

													deferred
														.resolve(
															store.update(
																params.collection
															,	_.pick(params,'id')
															,	params.query
															)
														)

													return deferred.promise
												}
									,	create:	function(params)
												{
													var deferred
													=	Q.defer()

													deferred
														.resolve(
															store.create(
																params.collection
															,	params.query
															)
														)

													return deferred.promise
												}
									,	delete:	function(params)
												{
													var deferred
													=	Q.defer()

													deferred
														.resolve(
															store.delete(
																params.collection
															,	_.pick(params,'id')
															)
														)

													return deferred.promise
												}
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
						
						return	function(promised_data,collection_query,profile,collection_url)
							{
								var	isEmptyEmbedded
								=	function(embedded)
									{
										return	_.isEmpty(
													(embedded.resource._embedded.collection)
													?	embedded.resource._embedded.collection
													:	_.omit(embedded,'_links')
												)

									}
								,	async_resolve_embedded
								=	function(link,source,type)
									{										
										var deferred
										=	Q.defer()

										router(
											'GET'
										,	_.last(
												_.values(link)
											)
										,	{}
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
											function(resolved_embeddeds)
											{
												var links
												=	_.object(
														_.keys(assoc_generic_link)
													,	[
														_.map(
															resolved_embeddeds.resource._embedded.collection
														,	function(item)
															{
																return	assoc.get_linked(item)
															}
														)
														]
													)
												deferred
													.resolve(
														(isEmptyEmbedded(resolved_embeddeds))
														?	{}
														:	_.object(
																(embedded_type == "none")
																?	['links']
																:	['links','embeddeds']
															,	(embedded_type == "none")
																?	[links]
																:	[links
																	,	_.object(
																			_.keys(assoc_generic_link)
																		,	[resolved_embeddeds]
																		)
																	]
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
										,	template_linked
										=	api.templates.linked
										async_resolve_embedded(assoc_generic_link,item)
										.then(
											function(resolved_embeddeds)
											{
												var links
												=	_.reduce(
														_.map(
															resolved_embeddeds.resource._embedded.collection
														,	function(item)
															{	
																return	_.object(
																		[assoc.get_linked_rel(item)]
																	,	[assoc.get_linked(item)]
																	)
															}
														)
													,	function(memo,link)
														{
															return _.extend(
																	memo
																,	link
																)
														}	
													,	{}
													)

												deferred
													.resolve(
														(isEmptyEmbedded(resolved_embeddeds))
														?	{}
														:	_.object(
																(embedded_type == "none")
																?	['links']
																:	['links','embeddeds']
															,	(embedded_type == "none")
																?	[links]
																:	[links
																	,	_.object(
																			_.keys(assoc_generic_link)
																		,	[resolved_embeddeds]
																		)
																	]
															)
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
															(isEmptyEmbedded(resolved_embeddeds))
															?	{}
															:	{
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
										,	(profile == "single")
											?	"none"
											:	associations[assoc_key].embedded.type
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
										,	hal_result
										=	new hal_builder(
												item
											,	api.get_resource_url(item)
											)

										if (_.isEmpty(item) || _.isEmpty(associations)) 
											deferred
												.resolve(
													hal_result
												)
										else
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
								,	async_build_one_from_collection
								=	function(data,collection)
									{
										var	deferred
										=	Q.defer()

										async_build_one(data)
										.then(
											function(hal)
											{
												collection.push(hal)
												deferred
													.resolve(
														collection
													)
											}
										)

										return deferred.promise
									}
								,	async_collection
								=	function(data)
									{
										var	deferred
										=	Q.defer()

										_.rest(
											data
										).reduce(
											function (soFar, iteration)
											{
												return	soFar
														.then(
															function(result)
															{
																return async_build_one_from_collection(iteration,result)
															}
														)
											}
										,	async_build_one_from_collection(
												_.first(
													data
												)
											,	[]
											)
										).then(
											function(result)
											{
												deferred
													.resolve(
														result	
													)
											}
										)
										return 	deferred.promise
									}
								,	async_build_many
								=	function(data)
									{
										var	deferred
										=	Q.defer()

										async_collection(data.items)
										.then(
											function(resolved)
											{
												deferred
													.resolve(
														new hal_collection_builder(
																{
																	items:resolved
																,	count:data.count
																}
															,	_.extend(
																	{
																		collection_url: (_.isUndefined(collection_url))
																					?api.get_resource_url()
																					:collection_url
																	}
																,	transform_spec.collection
																,	collection_query
																)
															,	_.has(collection_query, "type") 
																?	collection_query.type
																: 	transform_spec.collection.type
														)
													)
											}
										)

										return deferred.promise
									}

								var	deferred 
								=	Q.defer()

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
				var	GET
				=	function(url,item,parsed,profile)
					{	
						var	deferred
						=	Q.defer()
						,	collection_url
						=	parsed.subcollection
								?url
								:undefined
						,	query
						=	spec_methods[item]
						,	builder
						=	spec_builders[item]
						
						deferred
							.resolve(
								builder(
									query.read(parsed)
								,	parsed.collection_query
								,	profile
								,	collection_url
								)
							)

						return	deferred.promise
					}
				,	POST
				=	function(url,item,parsed)
					{
						var	deferred
						=	Q.defer()

						if (_.isString(parsed.subcollection) || _.isUndefined(parsed.id))
							GET(url,item,parsed)
							.then(
								function(result)
								{
									deferred
										.resolve(
											result
										)
								}
							)
						else
							deferred
								.resolve(
									spec_builders[item](
										spec_methods[item].update(parsed)
									)
								)
					
						return deferred.promise
					}
				,	PUT
				=	function(url,item,parsed)
					{
						var	deferred
						=	Q.defer()

						deferred
							.resolve(
								spec_builders[item](
										spec_methods[item].create(parsed)
									)
							)

						return deferred.promise
					}
				,	DELETE
				=	function(url,item,parsed)
					{
						var	deferred
						=	Q.defer()

						deferred
							.resolve(
								spec_builders[item](
										spec_methods[item].delete(parsed)
									)
							)

						return deferred.promise
					}
				,	router
				=	function(method,url,body,source,profile)
					{
						var	deferred
						=	Q.defer()
						,	method_function
						=	eval(method)
						,	parsed_original
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
								_.omit(parsed_original.queryKey,val)
							}
						)
						var	parsed
						=	{
								collection: spec[parts[1]].storage.name
							,	id:parts[2]
							,	association: 	parts[3]
							,	subcollection:	_.isUndefined(parts[3])
												?	parts[3]
												:	spec[parts[1]].associations[parts[3]].target
							,	query:	body
							,	collection_query: collection_params
							}
						if(parts)
						{
							var	item
							=	parsed.subcollection
									?spec[parsed.collection]
										.associations[parts[3]]
										.target
									:parsed.collection

							method_function(
								url
							,	item
							,	parsed
							,	source
							,	profile
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

						} else
							deferred
								.resolve(
									404
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