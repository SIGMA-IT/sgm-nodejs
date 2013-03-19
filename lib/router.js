var	Factory
=	function(
		_
	,	hal
	,	hal_builder
	,	hal_collection_builder
	,	parseUri
	,	Q
	,	logger
	)
	{
	return	function(assoc_transforms,store,spec)
		{
			var visited
			=	new Array()
			var register_url
			=	function(spec_key,assoc_key,item)
				{
					var	assoc
					=	spec[spec_key].associations[assoc_key]

					visited
						.push(
							{
								from: spec_key
							,	to: assoc.target
							,	rel: assoc.type
							,	url: assoc.get_resource_url(item)
							,	item: item
							}
						)
				}
			,	check_url
			=	function(spec_key,assoc_key,item)
				{
					var	assoc
					=	spec[spec_key].associations[assoc_key]
					,	inverse
					return	!_.isUndefined(
								_.find(
									visited
								,	function(visited_resource)
									{
										inverse
										=	assoc_transforms.get_inverse(assoc,visited_resource.item)
										return	(
													visited_resource.from	== inverse.to
												&&	visited_resource.to		== inverse.from
												&&	visited_resource.rel	== inverse.rel
												&&	visited_resource.url	== inverse.url
												)
												||
												(
													visited_resource.url	== assoc.get_resource_url(item)
												)
									}
								)
							)
				}
			this.clear_register
			=	function()
				{
					visited = new Array()
				}
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
											, related
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

											deferred
												.resolve(
													store[type_functions[type]](
															entry
														,	_.extend(
																_.pick(params,'collection_query','query','through')
															,	related
															)
														)
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

						return	function(promised_data,collection_query,collection_url)
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
								=	function(link)
									{	
										var deferred
										=	Q.defer()

										router(
											'GET'
										,	_.last(
												_.values(link)
											)
										,	{}
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

										if (embedded_type != "none" )
											async_resolve_embedded(assoc_generic_link)
											.then(
												function(resolved_embeddeds)
												{
													deferred
														.resolve(
															isEmptyEmbedded(resolved_embeddeds)
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
										,	resource_url
										=	associations[assoc_key].get_resource_url(item)
										,	embedded_type
										=	associations[assoc_key].embedded.type

										if	(
												embedded_type != "none"
											&&	(associations[assoc_key].type.split(":").length == 1)
											&&	check_url(transform_entry,assoc_key,item)
											)
										{
											embedded_type = "none"
											logger.notice("Avoided Circular Reference in <<"+transform_entry+">>:<<"+assoc_key+">>")
										}
										else
											if (embedded_type != "none")
												register_url(transform_entry,assoc_key,item)

										link_function(
											associations[assoc_key]
										,	associations[assoc_key].linked.type
										,	embedded_type
										,	_.object(
												[assoc_key]
											,	[resource_url]
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
														result
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

										if (_.isEmpty(item) || _.isUndefined(item))
													async_build_msg(
														"error"
													,	"Resource not Found"
													,	404
													)
													.then(
														function(hal)
														{
															deferred
																.resolve(
																	hal
																)
														}
													)
										else
										{
											var	hal_result
											=	new hal_builder(
													item
												,	api.get_resource_url(item)
												)
											if (_.isUndefined(spec[transform_entry].source))
											{
												if (_.isEmpty(associations)) 
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
											}
											else
											{
												async_gerenate_f_resource(item)
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
											}
										}

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
								=	function(items,count)
									{
										var	deferred
										=	Q.defer()

										async_collection(items)
										.then(
											function(resolved)
											{
												deferred
													.resolve(
														new hal_collection_builder(
																{
																	items:resolved
																,	count:count
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
								,	async_build_msg
								=	function(type,msg,code)
									{
										var deferred
										=	Q.defer()

										deferred
											.resolve(
												new hal_builder(
													{
														type: type
													,	msg: msg
													,	code: code
													}
												,	api.get_msg({code: code})
												)
											)

										return deferred.promise
									}

								var	deferred 
								=	Q.defer()

								promised_data
								.then(
									function(resolved_data)
									{
										resolved_data.items
										.then(
											function(items)
											{
												resolved_data.count
												.then(
													function(count)
													{
														deferred
															.resolve(
																_.isUndefined(items)
																?	async_build_msg(
																		"error"
																	,	"Resource not Found"
																	,	404
																	)
																:	_.isArray(items)
																	?	async_build_many(items,count)
																	:	async_build_one(items)
															)
													}
												)
											}
										)
									}
								)

								return deferred.promise
							}
						}
					)
				var	GET
				=	function(url,item,parsed)
					{	
						var	deferred
						=	Q.defer()
						,	collection_url
						=	parsed.subcollection
							?	url
							:	undefined

						if (!_.isUndefined(spec[item].source))
						{
							var join
							=	spec[item].associations[parsed.query.association].target
							,	association_rel
							=	parsed.query.association
							,	join_parsed
							=	{
									collection: join
								,	id: undefined
								,	association: undefined
								,	subcollection: undefined
								,	query: 	_.omit(
												parsed.query
											,	['id','association']
											)
								,	collection_query: parsed.collection_query
								}
							,	parsed
							=	_.extend(
									parsed
								,	{
										id: parsed.query.id
									,	query: {}
									}
								)
							,	item 
							=	spec[item].source
							GET(url,item,parsed)
							.then(
								function(item_resource)
								{
									GET(spec[join].api.get_resource_url({}),join,join_parsed)
									.then(
										function(association_resource)
										{
											_.extend(
												item_resource.resource._links
											,	_.object(
													[association_rel]
												,	[association_resource.resource._links.self]
												)
											)
											_.extend(
												item_resource.resource._embedded
											,	_.object(
													[association_rel]
												,	[association_resource.resource]
												)
											)
											deferred
												.resolve(
													Q(item_resource)
												)
										}
									)
								}
							)
						}
						else
						{
							var	query
							=	spec_methods[item]
							,	builder
							=	spec_builders[item]
							deferred
								.resolve(
									builder(
										query
											.read(parsed)
									,	parsed.collection_query
									,	collection_url
									)
								)
						}

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
										spec_methods[item].create(parsed)
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
										spec_methods[item].update(parsed)
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
				=	function(method,url,body)
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
						,	process
						=	true

						if (_.isUndefined(spec[parts[1]]))
						{
							logger.warning("False url <<"+url+">>. Unknown entity <<"+parts[1]+">>")
							process = false
						}
						else
							if (!_.isUndefined(parts[3]) && _.isUndefined(spec[parts[1]].associations[parts[3]].target))
							{
								logger.warning("False url <<"+url+">>. Unknown entity <<"+spec[parts[1]].associations[parts[3]].target+">>")
								process = false
							}
						if (process)
						{
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
									collection: parts[1]
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
									?	parsed.subcollection
									:	parsed.collection
								
								if (!_.isUndefined(spec[parsed.collection].source) && method != "POST")
								{
									logger.warning("Entity <<"+parsed.collection+">> dont support method <<"+method+">>")
									deferred
									.resolve(
										{error: "404"}
									)
								}
								else
									method_function(
										url
									,	item
									,	parsed
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
										{error: "404"}
									)
						} else
								deferred
									.resolve(
										{error: "404"}
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