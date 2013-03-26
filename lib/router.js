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
	return	function(assoc_transforms,store,spec,server_config)
		{
			Q.longStackJumpLimit = 0;

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
													visited_resource.from	==	inverse.to
												&&	visited_resource.to		==	inverse.from
												&&	visited_resource.rel	==	inverse.rel
												&&	visited_resource.url	==	inverse.url
												)
												||
												(
													visited_resource.url	==	assoc.get_resource_url(item)
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
									,	show:	function(collection,subcollection,id)
										{
											var	deferred
											=	Q.defer()
											
											deferred
												.resolve(
													store.find(
														this.entry
													,	_.isUndefined(subcollection)
														?	{
																key : 'id'
															,	value: id
															}
														:	assoc_transforms
																.get_filter_related(
																	collection
																,	this.entry
																,	{
																		id: id
																	}
																)
													)
												)

											return deferred.promise
										}
									,	list:	function(collection,subcollection,query,id)
										{
											var	deferred
											=	Q.defer()

											deferred
												.resolve(
													store.filter(
															this.entry
														,	_.isUndefined(subcollection)
															?	query
															:	_.extend(
																	assoc_transforms
																		.get_filter_related(
																			collection
																		,	this.entry
																		,	{
																				id: id
																			}
																		)
																,	query
																)
														)
												)

											return deferred.promise
										}
									,	filter: function(params)
										{
											var	deferred
											=	Q.defer()
											,	query
											=	{
													query:	_.isUndefined(params.body.query)
															?	{}
															:	params.body.query
												,	collection_query:	_.omit(params.body.collection_query,'type')
												}
											deferred
												.resolve(
													store.filter(
															this.entry
														,	_.isUndefined(params.subcollection)
															?	query
															:	_.extend(
																	assoc_transforms
																		.get_filter_related(
																			params.collection
																		,	this.entry
																		,	{
																				id: params.id
																			}
																		)
																,	query
																)
														)
												)

											return deferred.promise
										}
									,	join: function(id,assocs,collection)
										{
											var	deferred
											=	Q.defer()
											,	toJoin
											=	{links:{},embeddeds:{}}
											
											_.each(
												collection
											,	function(resolved,key)
												{
													resolved.resource._links.self.rel = assocs[key].name
													_.extend(
														toJoin.links
													,	_.object(
															[assocs[key].name]
														,	[resolved.resource._links.self.href]
														)
													)
													_.extend(
														toJoin.embeddeds
													,	_.object(
															[assocs[key].name]
														,	[resolved]
														)
													)
												}
											)

											store.find(
												this.entry
											,	{
													key : 'id'
												,	value: id
												}
											).then(
												function(resolved)
												{
													deferred
														.resolve(
															_.extend(
																resolved
															,	{
																	join:	toJoin 
																}
															)
														)
												}
											)

											return	deferred.promise
										}
									,	update:	function(params)
										{
											var	deferred
											=	Q.defer()

											deferred
												.resolve(
													store.update(
														this.entry
													,	_.pick(params,'id')
													,	params.body.query
													)
												)

											return deferred.promise
										}
									,	create:	function(query)
										{
											var deferred
											=	Q.defer()

											deferred
												.resolve(
													store.create(
														this.entry
													,	query
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
														this.entry
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
								var	async_resolve_embedded
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
								=	function(assoc,embedded_type,assoc_generic_link,item)
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
														_.object(
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
								=	function(assoc,embedded_type,assoc_generic_link,item)
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
														_.object(
															(embedded_type == "none")
															?	['links']
															:	['links','embeddeds']
														,	(embedded_type == "none")
															?	[links]
															:	[
																	links
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
								=	function(assoc,embedded_type,assoc_generic_link,item)
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
								=	function(assoc_key,item)
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
												deferred
													.resolve(
														resolved	
													)
											}
										)

										return deferred.promise
									}
								,	async_build_one
								=	function(item,toJoin)
									{
										var	deferred
										=	Q.defer()
										,	hal_result
										=	new hal_builder(
												item
											,	api.get_resource_url(item)
											)
										if (_.isEmpty(associations)) 
											deferred
												.resolve(
													hal_result
												)
										else
											Q.all(
												_.map(
													associations
												,	function(assoc,assoc_key)
													{
														return async_resolve_assoc(assoc_key,item)
													}
												)
											).then(
												function(resolved)
												{
													_.each(
														_.isUndefined(toJoin)
														?	resolved
														:	_.union(
																resolved
															,	toJoin
															)
													,	function(resolved_assoc)
														{
															hal_result
																.link(
																	resolved_assoc.links
																)
																.embedded(
																	resolved_assoc.embeddeds
																)
														}
													)
													deferred
														.resolve(
															hal_result
														)
												}
											)

										return	deferred.promise
									}
								,	async_build_many
								=	function(items,count)
									{
										var	deferred
										=	Q.defer()

										Q.all(
											_.map(
												items
											,	function(item)
												{
													return async_build_one(item)
												}
											)
										)
										.then(
											function(resolved_items)
											{
												deferred
													.resolve(
														new hal_collection_builder(
																{
																	items:resolved_items
																,	count:count
																}
															,	_.extend(
																	{
																		collection_url:	_.isUndefined(collection_url)
																						?	api.get_resource_url()
																						:	collection_url
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
																_.isUndefined(items) || _.isEmpty(items)
																?	async_build_msg(
																		"error"
																	,	"Resource not Found"
																	,	404
																	)
																:	_.isArray(items)
																	?	async_build_many(items,count)
																	:	async_build_one(items,resolved_data.join)
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
				=	function(url,parsed)
					{	
						var	deferred
						=	Q.defer()
						,	item
						=	_.isUndefined(parsed.subcollection)
							?	parsed.collection
							:	parsed.subcollection
						,	type
						=	_.isUndefined(parsed.subcollection)
								?	_.isUndefined(parsed.id)
									?	'list'
									:	'show'
								:	_.contains(['has-many','has-many:through'],spec[parsed.collection].associations[parsed.association].type)
									?	'list'
									:	'show'

						if (type == 'list')
						{
							var	c_query
							=	_.objMap(
									_.object(
										['type','page','ipp']
									,	[undefined]
									)
								,	function(value,attr)
									{
										return 	_.isUndefined(parsed.query[attr])
												?	spec[item].collection[attr]
												:	parsed.query[attr]
									}
								)

							deferred
								.resolve(
									spec_builders[item](
										spec_methods[item]
											.list(
												parsed.collection
											,	parsed.subcollection
											,	{
													collection_query: c_query
												}
											,	parsed.id
											)
									,	c_query
									,	url
									)
								)
						}
						else
							deferred
								.resolve(
									spec_builders[item](
										spec_methods[item]
											.show(
												parsed.collection
											,	parsed.subcollection
											,	parsed.id
											)
									)
								)

						return	deferred.promise
					}
				,	POST
				=	function(url,parsed)
					{
						var	deferred
						=	Q.defer()
						,	item
						=	_.isUndefined(parsed.subcollection)
							?	parsed.collection
							:	parsed.subcollection

						switch(parsed.body.action)
						{
							case "create":
								deferred
									.resolve(
										spec_builders[item](
											spec_methods[item]
												.create(
													parsed.body.query
												)
										)
									)
								break
							case "filter":
								parsed.body.collection_query
								=	_.isUndefined(parsed.body.collection_query)
									?	spec[item].collection
									:	_.objMap(
											spec[item].collection[attr]
										,	function(value,attr)
											{
												return	_.isUndefined(parsed.body.collection_query[attr])
														?	spec[item].collection[attr]
														:	parsed.body.collection_query[attr]
											}
										)
								deferred
									.resolve(
										spec_builders[item](
											spec_methods[item]
												.filter(
													parsed
												)
											,	parsed.body.collection_query
											,	url
										)
									)
								break
							case "join":
								if (_.isEmpty(parsed.body.associations) || _.isUndefined(parsed.id))
								{
									logger.warning(
										_.isUndefined(parsed.id)
										?	"Required id in Action <<Join>>. Unable to complete request <<"+url+">>"
										:	"Empty body associations in <<POST>> requested <<"+url+">>"
									)
									deferred
										.resolve(
											{error:404}
										)
								}
								else
								{
									Q.all(
										_.map(
											parsed.body.associations
										,	function(assoc)
											{
												return	_.isUndefined(assoc.id)
														?	spec_builders[assoc.name](
																spec_methods[assoc.name]
																	.list(
																		assoc.name
																	,	undefined
																	,	{
																			query: assoc.query
																		,	collection_query: assoc.collection_query
																		}
																	)
															)
														:	spec_builders[assoc.name](
																spec_methods[assoc.name]
																	.show(
																		assoc.name
																	,	undefined
																	,	assoc.id
																	)
															)
											}
										)
									).then(
										function(resource_collection)
										{
											deferred
												.resolve(
													spec_builders[parsed.collection](
														spec_methods[parsed.collection]
															.join(
																parsed.id
															,	parsed.body.associations
															,	resource_collection
															)
													)
												)
										}
									)
								}
								break
							default:
								if (_.isEmpty(parsed.body))
									logger.warning("Empty body in <<POST>> requested <<"+url+">>")
								else
									logger.warning("Unkown action <<POST>> requested <<"+url+">>")
								deferred
									.resolve(
										{error:404}
									)
						}
				
						return deferred.promise
					}
				,	PUT
				=	function(url,parsed)
					{
						var	deferred
						=	Q.defer()
						if (_.isEmpty(parsed.body))
						{
							logger.warning("Empty body in <<PUT>> request <<"+url+">>")
							deferred
								.resolve(
									{error:404}
								)
						}
						else
							if (_.isUndefined(parsed.subcollection))
								deferred
									.resolve(
										spec_builders[parsed.collection](
											spec_methods[parsed.collection].update(parsed)
										)
									)
							else
							{
								logger.warning("Unable to update subcollection in request <<"+url+">>")
								deferred
									.resolve(
										{error:404}
									)
							}

						return deferred.promise
					}
				,	DELETE
				=	function(url,parsed)
					{
						var	deferred
						=	Q.defer()

						if (_.isUndefined(parsed.subcollection))
								deferred
									.resolve(
										spec_builders[parsed.collection](
											spec_methods[parsed.collection].delete(parsed)
										)
									)
							else
							{
								logger.warning("Unable to delete subcollection in request <<"+url+">>")
								deferred
									.resolve(
										{error:404}
									)
							}

						return deferred.promise
					}
				,	router
				=	function(method,url,body)
					{
						var	deferred
						=	Q.defer()
						,	parsed_url
						=	parseUri(url)
						,	valid_url
						=	parsed_url.path.match(RegExp('^'+server_config.base+'(.*)$'))[1]
						,	parts
						=	valid_url.match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
						,	method_function
						=	eval(method)

						if (_.isUndefined(spec[parts[1]]))
							logger.warning("False url <<"+valid_url+">>. Unknown entity <<"+parts[1]+">>")
						else
							if (!_.isUndefined(parts[3]) && _.isUndefined(spec[parts[1]].associations[parts[3]].target))
								logger.warning("False url <<"+valid_url+">>. Unknown entity <<"+spec[parts[1]].associations[parts[3]].target+">>")
							else
								method_function(
									url
								,	{
										collection: parts[1]
									,	id: parts[2]
									,	association: parts[3]
									,	subcollection:	_.isUndefined(parts[3])
														?	undefined
														:	spec[parts[1]].associations[parts[3]].target
									,	query:	parsed_url.queryKey
									,	body: body
									}
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